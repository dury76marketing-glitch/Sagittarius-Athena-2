import { randomUUID } from 'node:crypto';
import { quoteObservedAt } from './authority.mjs';
import WebSocket from 'ws';
import { setTimeout as sleep } from 'node:timers/promises';
import { isMatchDecisionMarket, MAX_HISTORY } from './doctrine.mjs';
import { parseMarket, signKalshi } from './kalshi.mjs';
import {BackgroundBookRecovery} from './backgroundBookRecovery.mjs';
import {R17_FEED_POLICY,stableR17WatchWindow} from './goldenSaintFeedPolicy.mjs';
import {researchSeriesForMarket} from './gameClock.mjs';

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
// MWF1: membership commands are serialized and acknowledged. Never replace a
// live socket merely because the discovery membership changed.
const MARKET_MEMBERSHIP_CHANNELS = Object.freeze(['orderbook_delta','ticker','trade']);
const MARKET_MEMBERSHIP_TIMEOUT_MS = 10_000;
const MARKET_PROTECTED_MARK_FRESH_MS = 15_000;
const RECOVERY_DELTA_BUFFER_LIMIT = 2048;
const RECOVERY_SNAPSHOT_TIMEOUT_MS = 5_000;
const RECOVERY_SNAPSHOT_MAX_ATTEMPTS = 3;
const RECOVERY_COOLDOWN_MS = 15_000;
const RECOVERY_COOLDOWN_MAX_MS = 60_000;
const RECOVERY_COMMAND_INTERVAL_MS = 250;
const RECOVERY_COMMANDS_IN_FLIGHT = 2;
const RECONNECT_STABLE_MS = 65_000;
// Kalshi quotes prices to four dollar decimals. Rounding these to whole
// cents can invent executable price levels and change spread/profit checks.
const decimal=(v,{signed=false}={})=>(typeof v==='number'&&Number.isFinite(v))
  ||(typeof v==='string'&&(signed?/^-?\d+(?:\.\d+)?$/:/^\d+(?:\.\d+)?$/).test(v));
const contractUnits=(v,{signed=false}={})=>{
  if(!decimal(v,{signed})||(!signed&&Number(v)<0))return false;
  const scaled=Number(v)*100;
  return Number.isSafeInteger(Math.round(scaled))&&Math.abs(scaled-Math.round(scaled))<=1e-7;
};
const cents = (v) => {
  if(!decimal(v)||Number(v)<0)return NaN;
  const scaled=Number(v)*10000;
  return Number.isSafeInteger(Math.round(scaled))&&Math.abs(scaled-Math.round(scaled))<=1e-7
    ?Math.round(scaled)/100:NaN;
};
const validQuote = (q) => q && q.yesBid >= 0 && q.yesAsk > 0 && q.yesAsk <= 100 && q.yesBid <= q.yesAsk;
const finalStatus = (q) => ['finalized', 'settled'].includes(String(q?.status || '').toLowerCase()) && Boolean(q?.result);
const terminalMarketEvidence = q => Boolean(q?.result)||['closed','determined','disputed','finalized','settled','amended','canceled','cancelled'].includes(String(q?.status||'').toLowerCase());
const finiteInt = (v) => ((typeof v==='number'&&Number.isSafeInteger(v))
  ||(typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))))&&Number(v)>=0?Number(v):null;
const sidOf = (data, msg) => finiteInt(data?.sid ?? msg?.sid);
const seqOf = (data, msg) => finiteInt(data?.seq ?? msg?.seq);

function parseLevels(arr = []) {
  if(!Array.isArray(arr))return null;
  const prices=new Set(),out=[];
  for(const x of arr){
    if(!Array.isArray(x)||x.length!==2||!contractUnits(x[1]))return null;
    const priceCents=cents(x[0]),count=Number(x[1]);
    if(!(priceCents>0&&priceCents<100)||!Number.isFinite(count)||count<0||prices.has(priceCents))return null;
    prices.add(priceCents);
    if(count>0)out.push({priceCents,count});
  }
  return out.sort((a,b)=>b.priceCents-a.priceCents);
}

function yesAsksFromNoBids(noBids = []) {
  return noBids
    .map((x) => ({ priceCents: Math.round((100-x.priceCents)*100)/100, count: x.count }))
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

// The exact same strictly bounded sporting-series research key is used by
// both the scout selection and the independent GameClockAuthority.
export {researchSeriesForMarket} from './gameClock.mjs';

export class MarketHub {
  constructor({ kalshi, wsUrl, fallbackWsUrl, getCredentials, onStatus = () => {}, onQuote = () => {}, onPrivate = () => {}, WebSocketClass = WebSocket }) {
    this.kalshi = kalshi;
    // Dependency injection is test-only; ordinary engine construction uses
    // the same ws client and authenticated handshake as the R3 baseline.
    this.WebSocketClass = WebSocketClass;
    this.wsUrl = wsUrl;
    this.fallbackWsUrl = fallbackWsUrl;
    this.getCredentials = getCredentials;
    this.onStatus = onStatus;
    this.onQuote = onQuote;
    this.onPrivate = onPrivate;
    this.quoteEpoch = randomUUID();
    this.quoteRevision = 0;
    this.connectionEpoch = 0;
    this.observationStats = {accepted:0, stale:0, duplicate:0};
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
    // Independent of entry-time proof: keep non-authoritative REST recovery
    // from flooding the account's bounded read lane on a many-market gap.
    this.backgroundRestRecovery=new BackgroundBookRecovery();
    this.wsSubscriptionCommands = new Map();
    this.wsSubscriptions = new Map();
    this.wsInitialMarketSubscriptions = new Map();
    this.wsMarketMembership = new Map();
    this.wsMembershipCommands = new Map();
    // Retry evidence mismatches only after a bounded cooldown. The broker's
    // confirmed list remains authoritative; no market gains subscription
    // authority merely because we requested it. One record per WS channel.
    this.wsMembershipRetry = new Map();
    this.wsMembershipFlushQueued = false;
    // Share an in-flight, non-destructive REST verification among concurrent
    // callers for the same ticker/connection epoch. Never extend its TTL.
    this.verificationInFlight = new Map();
    // Transport-only coalescing across execution verification and background
    // recovery. No persisted/cache authority is shared: each caller still
    // applies its own book, epoch, revision and protected-market validation.
    // One slot per ticker prevents old connection-epoch work retaining a map.
    this.restOrderbookInFlight = new Map();
    this.discoveryWanted = new Set();
    this.protectionPriority = {open:new Set(),watch:new Set()};
    this.r17WatchTickers=new Set();
    this.r17WatchCursor=0;
    this.r17WatchWindowAtMs=0;
    this.r17WatchWindow=[];
    this.legacyWatchCursor=0;this.legacyWatchWindowAtMs=0;this.legacyWatchWindow=[];
    this.priorityMissingRestCursor=0;this.priorityRestCalls=0;
    this.priorityRestPending=new Map();this.priorityRestLastAttempt=new Map();
    this.priorityRestRecoveryStats={started:0,completed:0,timeouts:0,failed:0,skipped:0};
    this.pregameScoutStats={version:'R30-OBSERVATION-ONLY',scans:0};
    this.r17FeedStats={version:'R17-MEGAWAVE-FEED-V1',eligibleWatchTickers:0,
      coveredWatchTickers:0,rotationCount:0,subscriptionWindowAtMs:0};
    this.protectionEvaluations = new Map();
    this.membershipStats = {version:'MW-FEED-MEMBERSHIP-V1',increments:0,decrements:0,
      acknowledgements:0,errors:0,timeouts:0,preventedReconnects:0,last:null};
    // Bounded, non-secret diagnostics. A failed feed must not export only a
    // boolean while discarding the reason LIVE readiness was withdrawn.
    this.connectionDiagnostics = {version:'LIVE-FEED-HEALTH-R2',connections:0,disconnects:0,
      transportErrors:0,subscriptionErrors:0,malformedMessages:0,lastEvent:null,lastFailure:null,lastDisconnect:null};

    // R63 maintenance HF1: Kalshi orderbook sequence is subscription-scoped,
    // never ticker-scoped. Each SID retains one global cursor plus the tickers
    // currently proven to belong to that stream. Recovery state is bounded by
    // the wanted/safety ticker set and requires no timer, worker or DB surface.
    this.orderbookStreams = new Map();
    this.recoverySnapshotCommands = new Map();
    // Ticker failure budgets survive transport replacement. Only a valid full
    // WS snapshot (or removal from the subscribed/safety set) clears them.
    this.tickerRecovery = new Map();
    this.lastRecoveryDispatchAtMs = 0;
    this.lastRecoveryFailure = null;
    this.recoveryReconnectPending = false;
    this.wsCommandId = 1;
    this.runtimeMaintenance = {
      version:MARKET_RUNTIME_MAINTENANCE.version,lastRunAtMs:0,lastInvalidRefreshAtMs:0,runs:0,
      prunedQuotes:0,prunedBooks:0,prunedHistories:0,trimmedHistories:0,
      staleCommandsReleased:0,orphanDeltaBuffersReleased:0,invalidBooksRefreshed:0,lastResult:null,
      invalidRefreshCursors:{open:0,watch:0,research:0},
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
      recoveryCooldowns:0,
      recoveryRestDeferrals:0,
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

  subscribeQuote(ticker, listener) {
    this.quoteObservers ||= new Map();
    const key=String(ticker),listeners=this.quoteObservers.get(key)||new Set();
    listeners.add(listener);this.quoteObservers.set(key,listeners);
    return ()=>{listeners.delete(listener);if(!listeners.size)this.quoteObservers.delete(key);};
  }

  publishQuote(q,{source='REST',stream='',sequence=null,requestRevision=null,emit=false}={}) {
    this.quoteEpoch ||= randomUUID();this.quoteRevision ||= 0;
    this.observationStats ||= {accepted:0,stale:0,duplicate:0};
    const old=this.quotes.get(q?.ticker);
    if(!q?.ticker)return null;
    const at=quoteObservedAt(q),priorAt=quoteObservedAt(old);
    const previous=old?.quoteObservation;
    this.quoteStreamSequences ||= new Map();
    const streamKey=JSON.stringify([q.ticker,source,stream]);
    const priorSequence=this.quoteStreamSequences.get(streamKey);
    const sameStream=Boolean(stream) && priorSequence!=null;
    const hasSequence=sequence!=null && Number.isFinite(Number(sequence));
    const changes=old && (q.yesBid!==old.yesBid || q.yesAsk!==old.yesAsk || q.status!==old.status || q.result!==old.result);
    if ((requestRevision!=null && Number(previous?.revision||0)>requestRevision && changes)
        || (sameStream && hasSequence && Number(sequence)<priorSequence)
        || (old && at<priorAt)) { this.observationStats.stale++;return old; }
    if(old && sameStream && hasSequence && Number(sequence)===priorSequence){
      this.observationStats.duplicate++;return old;
    }
    if(stream && hasSequence)this.quoteStreamSequences.set(streamKey,Number(sequence));
    const observation={epoch:this.quoteEpoch,liveEpoch:this.quoteEpoch,connectionEpoch:Number(this.connectionEpoch||0),revision:++this.quoteRevision,source,stream:stream||null,sequence:hasSequence?Number(sequence):null,observedAtMs:at,receivedAtMs:Date.now(),
      downwardRevision:Number(previous?.downwardRevision||0)+(old && Number(q.yesBid)<Number(old.yesBid)?1:0)};
    const next={...q,quoteObservation:observation};
    this.quotes.set(q.ticker,next);this.observationStats.accepted++;
    for(const fn of this.quoteObservers?.get(q.ticker)||[])fn(next);
    if(emit)this.onQuote(next);
    return next;
  }

  seed(q, options={}) {
    if (!q?.ticker) return;
    const old=this.quotes.get(q.ticker);
    if(old && quoteObservedAt(old)>quoteObservedAt(q))return old;
    const merged={...(old||{}),...q,recentTrades:Math.max(old?.recentTrades||0,q.recentTrades||0)};
    const quoteAtMs=quoteObservedAt(q);
    const normalized={...merged,quoteAtMs,updatedAtMs:quoteAtMs,bookInvalid:finalStatus(merged)?false:!validQuote(merged)||Boolean(merged.bookInvalid)};
    return this.publishQuote(normalized,{source:'REST',...options});
  }

  // Optional REST discovery NEVER occupies the awaited discovery/entry
  // lane. The Kalshi transport still owns real deadline and 429 pacing.
  // One in-flight job per ticker, bounded total slots and per-ticker
  // cooldown. A hung provider cannot hold the foreground scanner.
  schedulePriorityMarketRecovery(tickers,requestRevision){
    const cap=R17_FEED_POLICY.priorityRestRecoveryConcurrency;
    for(const ticker of tickers){
      if(this.priorityRestPending.size>=cap)break;
      if(this.priorityRestPending.has(ticker)||this.quotes.has(ticker))continue;
      const now=Date.now(),last=this.priorityRestLastAttempt.get(ticker)||0;
      if(now-last<15_000)continue;
      this.priorityRestLastAttempt.set(ticker,now);
      // Prevent an unbounded lifetime of cooldown records as market sets rotate.
      if(this.priorityRestLastAttempt.size>1024)
        this.priorityRestLastAttempt.delete(this.priorityRestLastAttempt.keys().next().value);
      const token=Symbol(ticker);this.priorityRestPending.set(ticker,token);
      this.priorityRestCalls++;this.priorityRestRecoveryStats.started++;
      // Initiate the optional read without awaiting it. An immediately
      // resolved provider can update the cache on the normal microtask turn.
      let provider;
      try {provider=Promise.resolve(this.kalshi.getMarket(ticker,
        {deadline:performance.now()+R17_FEED_POLICY.priorityRestRecoveryTimeoutMs}));}
      catch(error){provider=Promise.reject(error);}
      // The timeout is a scheduler fence. The underlying Kalshi request is
      // also supplied an explicit deadline so the broker read lane can stop.
      void Promise.resolve().then(async()=>{
        let timer;
        const expires=R17_FEED_POLICY.priorityRestRecoveryTimeoutMs;
        const timeout=new Promise(resolve=>{
          timer=setTimeout(()=>resolve({timedOut:true}),expires);
          timer.unref?.();
        });
        try{
          const response=provider.then(q=>({quote:q}),error=>({error}));
          const result=await Promise.race([response,timeout]);
          if(result?.timedOut){this.priorityRestRecoveryStats.timeouts++;return;}
          if(result?.error){this.priorityRestRecoveryStats.failed++;return;}
          // Only a currently wanted market can be re-seeded. A delayed
          // optional REST result cannot overwrite a fresher WS revision.
          const wanted=this.wanted?.has(ticker)||this.protectionPriority?.open?.has(ticker)
            ||this.r17WatchTickers?.has(ticker);
          if(!wanted){this.priorityRestRecoveryStats.skipped++;return;}
          if(result?.quote?.ticker===ticker)this.seed(result.quote,{requestRevision});
          this.priorityRestRecoveryStats.completed++;
        }finally{
          clearTimeout(timer);
          if(this.priorityRestPending.get(ticker)===token)this.priorityRestPending.delete(ticker);
        }
      }).catch(()=>{
        this.priorityRestRecoveryStats.failed++;
        if(this.priorityRestPending.get(ticker)===token)this.priorityRestPending.delete(ticker);
      });
    }
  }

  // R31: compile already-fetched Kalshi milestone schedules for discovery only.
  // NO new REST request, trade, clock admission, or signed broker operation.
  // Every suggestion is tied to an exact event/series identity and expires.
  observeClockScoutSchedules(seriesCache,now=Date.now()){
    const hints=new Map(),invalid=new Set();let sourceSeries=0;
    if(seriesCache instanceof Map)for(const [series,record] of seriesCache){
      const observed=Number(record?.observedAtMs||0);
      if(!(observed>0&&now-observed>=-2000&&now-observed<=60*60_000)
        ||!Array.isArray(record.rows))continue;
      sourceSeries++;
      for(const m of record.rows){
        const type=String(m?.type||'').toLowerCase();
        const category=String(m?.category||'').toLowerCase();
        if(!m?.id||!['sports','esports'].includes(category)
          ||!(/game|match/.test(type))||/season|series|tournament|multileg/.test(type))continue;
        const date=Date.parse(String(m.start_date||''));
        if(!Number.isSafeInteger(date)||date<946684800000
          ||date<now-30*60_000||date>now+14*24*60*60_000)continue;
        const related=[...new Set([...(Array.isArray(m.primary_event_tickers)?m.primary_event_tickers:[]),
          ...(Array.isArray(m.related_event_tickers)?m.related_event_tickers:[])].map(String).filter(Boolean))];
        for(const event of related){
          const key=JSON.stringify([String(series),event]);
          if(invalid.has(key))continue;
          const prior=hints.get(key);
          if(prior&&prior.milestoneId!==String(m.id)){
            hints.delete(key);invalid.add(key);continue;
          }
          if(hints.size<4096||hints.has(key))hints.set(key,{startMs:date,
            milestoneId:String(m.id),observedAtMs:observed});
        }
      }
    }
    this.clockScoutScheduleHints=hints;
    this.clockScoutScheduleStats={sourceSeries,hints:hints.size,ambiguous:invalid.size};
    return this.clockScoutScheduleStats;
  }

  async discover(priorityTickers = []) {
    const requestRevision=this.quoteRevision;
    const tradeData = await this.kalshi.getRecentTrades(5, 5);
    const [open, tradeMarkets] = await Promise.all([
      this.kalshi.getOpenMarkets(6, 3000).catch(() => []),
      this.kalshi.getLiveSportsViaTrades(tradeData).catch(() => []),
    ]);
    const merged = new Map();
    for (const q of [...open, ...tradeMarkets]) if (!merged.has(q.ticker)) merged.set(q.ticker, q);
    const now = Date.now();
    const markets = [],pregameClockCandidates=[];
    const scoutCounters={version:'R30-OBSERVATION-ONLY',scans:Number(this.pregameScoutStats?.scans||0)+1,
      fullScanAtMs:now,mergedMarkets:merged.size,eligibleMatchMarkets:0,
      quoteInvalid:0,quoteInvalidUpcoming2h:0,quietCandidates:0,
      quietUpcoming15m:0,quietUpcoming2h:0,quietFutureBeyond2h:0,
      pregameScoutsSelected:0,prioritizedActive:0,
      scheduleHintSources:Number(this.clockScoutScheduleStats?.sourceSeries||0),
      scheduleHintEntries:Number(this.clockScoutScheduleStats?.hints||0),
      selectedMilestoneHintCount:0,continuityRetained:0,uniqueQuietEvents:0,
      uniqueQuietSeries:0,recoveredQuietSeriesCandidates:0,
      scheduleWarm:{...(this.pregameScoutScheduleWarmStats||{})}};
    for (const q0 of merged.values()) {
      const q = { ...q0,clockProbeOnly:false };
      const t = q.ticker.toUpperCase();
      if (t.startsWith('KXMV') || DERIVATIVE.some((x) => t.includes(x))) continue;
      if (!t.includes('MATCH') && !t.includes('GAME')) continue;
      if(!isMatchDecisionMarket(q)||!q.canCloseEarly||q.closeTimeMs<=now)continue;
      scoutCounters.eligibleMatchMarkets++;
      if(!validQuote(q)){
        scoutCounters.quoteInvalid++;
        if(Number(q.occurrenceTimeMs)>now&&Number(q.occurrenceTimeMs)<=now+120*60_000)
          scoutCounters.quoteInvalidUpcoming2h++;
        continue;
      }
      const td = tradeData.get(q.ticker);
      q.recentTrades = td?.count || q.recentTrades || 0;
      q.recentTradesObservedAtMs = Number(td?.observedAtMs || 0);
      if (td?.lastPriceCents) q.lastPrice = td.lastPriceCents;
      const started = q.occurrenceTimeMs > 0 && q.occurrenceTimeMs < now;
      const moved = (q.prevYesBid > 0 && Math.abs(q.yesBid - q.prevYesBid) >= 2)
        || (q.prevYesAsk > 0 && Math.abs(q.yesAsk - q.prevYesAsk) >= 2);
      if (!q.recentTrades && !started && !moved) {
        scoutCounters.quietCandidates++;
        if(Number(q.occurrenceTimeMs)>now&&Number(q.occurrenceTimeMs)<=now+15*60_000)scoutCounters.quietUpcoming15m++;
        else if(Number(q.occurrenceTimeMs)>now&&Number(q.occurrenceTimeMs)<=now+120*60_000)scoutCounters.quietUpcoming2h++;
        else if(Number(q.occurrenceTimeMs)>now+120*60_000)scoutCounters.quietFutureBeyond2h++;
        // R29: a five-minute full-scan cadence used to omit every quiet
        // pregame market. Without a preceding provider pregame observation,
        // a subsequent LIVE status cannot safely bound the actual start.
        // Scheduled timestamps are ONLY discovery hints, never clock proof.
        // R30 measured zero candidates inside R29's 15-minute forecast
        // window on all three clones. 295 quiet matches instead had later
        // scheduled occurrence timestamps. Those timestamps are fallible and
        // MUST NOT grant kickoff authority, but do rank observation-only
        // discovery. Include strictly future, time-stamped candidates in the
        // existing six-event, 80-market, 50-tracker budget. Provider whole-
        // event pregame/live evidence remains the only bounded authority.
        if(Number.isSafeInteger(Number(q.occurrenceTimeMs))
          &&Number(q.occurrenceTimeMs)>now)
          pregameClockCandidates.push(q);
        continue;
      }
      this.seed(q,{requestRevision});
      // The role belongs to THIS discovery scan. A fresher WS quote may
      // legitimately reject the REST seed, but may not retain an older
      // clockProbeOnly=true flag and consume a reserved tracker slot.
      markets.push({...this.getQuote(q.ticker)||q,clockProbeOnly:false});
    }
    // Keep the existing 80-discovery ceiling and all independent priority
    // subscriptions. At most six quiet, next-scheduled future events can be
    // scouted per five-minute full scan. Scheduled dates only rank discovery;
    // never infer a kickoff or age from them. No bookmaker/rest exposure, trade or clock
    // authority is conferred by the forecast start used to discover them.
    const alreadyObservedEvents=new Set(markets.map(q=>String(q.eventTicker||q.ticker)));
    const uniquePregame=[];
    for(const candidate of pregameClockCandidates.sort((a,b)=>
      Number(a.occurrenceTimeMs)-Number(b.occurrenceTimeMs))){
      const event=String(candidate.eventTicker||candidate.ticker);
      if(!alreadyObservedEvents.has(event)){
        alreadyObservedEvents.add(event);uniquePregame.push(candidate);
      }
    }
    // R31 root: market occurrence_datetime is not a reliable sporting
    // schedule. Prefer a cached, exact-event Kalshi milestone start_date for
    // DISCOVERY RANKING ONLY; it must never become a trading start timestamp.
    // Preserve an already observed official pregame event continuously across
    // scans, so a 5-minute scanner plus two-event rotation cannot miss its LIVE
    // transition or turn a narrow bracket into an unusable >12-minute span.
    const hintFor=q=>{
      const key=JSON.stringify([researchSeriesForMarket(q),String(q.eventTicker||q.ticker)]);
      const hint=this.clockScoutScheduleHints?.get(key);
      return hint&&now-hint.observedAtMs>=-2000&&now-hint.observedAtMs<=60*60_000
        ?hint:null;
    };
    const dueAt=q=>{
      const official=hintFor(q)?.startMs;
      if(Number.isSafeInteger(official)&&official>now-5*60_000)return official;
      return Number(q.occurrenceTimeMs||0)||Number.MAX_SAFE_INTEGER;
    };
    // R34: maintain observation continuity through the owner game-time window.
    // A BOUNDED clock is PROVEN to have observed the pregame->LIVE transition,
    // but not to know an exact kickoff. Without this observation-only pin, the
    // quote can rotate out before a 60/70-minute minimum becomes eligible.
    // This flag cannot authorize a trade: every actual entry still requires
    // a fresh same-milestone status, executable book, funds, and native claim.
    const maxOwnerMinutes=Number(this.clockScoutOwnerMaxGameMinutes||0);
    const retainMs=Math.min(6*60*60_000,Math.max(90*60_000,
      (maxOwnerMinutes>0&&Number.isFinite(maxOwnerMinutes)?maxOwnerMinutes:180)*60_000+10*60_000));
    const observedPregame=q=>{
      const event=String(q.eventTicker||q.ticker);
      const raw=this.getQuote?.(q.ticker)?.gameClockState;
      if(!raw||raw.eventTicker!==event)return false;
      if(raw.phase==='UNKNOWN')return Boolean(raw.milestoneId
        &&raw.pregameMilestoneId===raw.milestoneId
        &&Number(raw.pregameObservedAtMs)>0
        &&now-Number(raw.pregameObservedAtMs)>=-2000
        &&now-Number(raw.pregameObservedAtMs)<=12*60_000);
      if(raw.phase==='SCHEDULE_LIVE'){
        const start=Number(raw.scheduledStartMs||0);
        return Boolean(raw.milestoneId&&raw.scheduleReferenceMilestoneId===raw.milestoneId
          &&raw.actualStartConfidence==='scheduled_estimate'
          &&Number.isSafeInteger(start)&&start>=946684800000
          &&now-start>=-2000&&now-start<=retainMs);
      }
      if(raw.phase==='BOUNDED'){
        const lower=Number(raw.boundedStartLowerMs||0),upper=Number(raw.boundedStartUpperMs||0);
        return Boolean(raw.source==='kalshi_live_data_status_transition'
          &&raw.milestoneId&&raw.pregameMilestoneId===raw.milestoneId
          &&Number.isSafeInteger(lower)&&Number.isSafeInteger(upper)
          &&lower>=946684800000&&upper>lower&&upper-lower<=12*60_000
          &&now-upper>=-2000&&now-lower<=retainMs);
      }
      if(raw.phase==='CONFIRMED'&&raw.confirmed===true&&raw.actualStartConfidence==='proven'){
        const actual=Number(raw.actualStartMs||0);
        return Number.isSafeInteger(actual)&&actual>=946684800000
          &&now-actual>=-2000&&now-actual<=retainMs;
      }
      return false;
    };
    uniquePregame.sort((a,b)=>dueAt(a)-dueAt(b)||String(a.ticker).localeCompare(String(b.ticker)));
    scoutCounters.uniqueQuietEvents=uniquePregame.length;
    // R32: expose a bounded, distinct QUIET-SERIES catalog for low-priority
    // schedule discovery. R31 only observed series already admitted as active;
    // that left quiet series without milestone hints, as Railway confirmed.
    this.pregameScoutCandidateSeries=[...new Set(uniquePregame.map(researchSeriesForMarket).filter(Boolean))].slice(0,80);
    scoutCounters.recoveredQuietSeriesCandidates=uniquePregame.filter(q=>!q.seriesTicker&&researchSeriesForMarket(q)).length;
    scoutCounters.uniqueQuietSeries=this.pregameScoutCandidateSeries.length;
    const selectedPregame=[],selectedEvents=new Set();
    const choose=q=>{const event=String(q.eventTicker||q.ticker);
      if(selectedEvents.has(event))return false;
      selectedPregame.push(q);selectedEvents.add(event);return true;};
    // The first four lanes belong to verifiably recently observed pregame
    // lifecycles, then the nearest scheduled market. Two remaining lanes rotate
    // across the tail and cannot monopolize BUY/protection/network capacity.
    const pinned=uniquePregame.filter(observedPregame).slice(0,4);
    for(const q of pinned)if(choose(q))scoutCounters.continuityRetained++;
    // No witnessed pregame means there is nothing authoritative to pin:
    // rotate ALL six lanes as R29 did, rather than wasting four on the same
    // unsupported market occurrence hints. Once pregame is genuinely seen,
    // retain that continuity and at most three nearest upcoming neighbors.
    const hasOfficialTimingHint=uniquePregame.some(q=>Boolean(hintFor(q)));
    if(pinned.length||hasOfficialTimingHint)
      for(const q of uniquePregame){if(selectedPregame.length>=4)break;choose(q);}
    const tail=uniquePregame.filter(q=>!selectedEvents.has(String(q.eventTicker||q.ticker)));
    if(tail.length){
      const slots=Math.min(6-selectedPregame.length,tail.length);
      const begin=Number(this.pregameClockDiscoveryCursor||0)%tail.length;
      for(let i=0;i<slots;i++)choose(tail[(begin+i)%tail.length]);
      this.pregameClockDiscoveryCursor=(begin+slots)%tail.length;
    }
    scoutCounters.selectedMilestoneHintCount=selectedPregame.filter(q=>Boolean(hintFor(q))).length;
    // Active candidates are never dropped below 74 to make room for scouts.
    markets.sort((a,b)=>Number(b.recentTrades||0)-Number(a.recentTrades||0));
    const capped=markets.slice(0,Math.max(0,80-selectedPregame.length));
    for(const q of selectedPregame){
      const probe={...q,clockProbeOnly:true};
      this.seed(probe,{requestRevision});
      // A fresher cached quote is price authority. It cannot erase the
      // selected scout role when seed() rejects an older REST snapshot.
      capped.push({...this.getQuote(probe.ticker)||probe,clockProbeOnly:true});
    }
    scoutCounters.pregameScoutsSelected=selectedPregame.length;
    scoutCounters.prioritizedActive=markets.length;
    this.pregameScoutStats=scoutCounters;
    const proposed=[...new Set([...capped.map(x=>x.ticker),...priorityTickers])];
    const subscribed=this.plannedWanted(proposed);
    // Research/discovery REST is optional. Never fan out dozens of sequential
    // getMarket() calls on a 48/171-ticker watch cohort: Kalshi's rate-limited
    // read lane is shared with BUY book proof and protection. Four distinct
    // missing markets per discovery pass; continuously rotate the remainder.
    // Funded positions and genuine exit protection have their own independent
    // quote/book recovery lane and are not starved by this research quota.
    const missingPriority=[...new Set(priorityTickers)].filter(ticker=>
      (subscribed.has(ticker)||this.quoteObservers?.get(ticker)?.size>0)
      &&!this.quotes.has(ticker));
    const budget=R17_FEED_POLICY.priorityMissingRestBudget;
    const begin=missingPriority.length?this.priorityMissingRestCursor%missingPriority.length:0;
    const picked=[];
    for(let i=0;i<Math.min(budget,missingPriority.length);i++)
      picked.push(missingPriority[(begin+i)%missingPriority.length]);
    this.priorityMissingRestCursor+=picked.length;
    this.setWanted(proposed);
    this.schedulePriorityMarketRecovery(picked,requestRevision);
    return capped;
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
    for(const key of this.quoteStreamSequences?.keys()||[])if(!keep.has(JSON.parse(key)[0]))this.quoteStreamSequences.delete(key);
    this.backgroundRestRecovery?.dropUnwanted(keep);
    for(const ticker of this.tickerRecovery.keys())if(!keep.has(ticker))this.tickerRecovery.delete(ticker);
    // Keep sequence/recovery metadata under the same RGM5 cache authority.
    for (const [sid,state] of this.orderbookStreams) {
      for (const ticker of [...state.tickers]) if (!keep.has(ticker)) state.tickers.delete(ticker);
      for (const ticker of [...state.pendingSnapshots]) if (!keep.has(ticker)) state.pendingSnapshots.delete(ticker);
      for (const ticker of [...state.pendingDeltas?.keys?.() || []]) if (!keep.has(ticker)) state.pendingDeltas.delete(ticker);
      for (const ticker of [...state.recoveryOverflow || []]) if (!keep.has(ticker)) state.recoveryOverflow.delete(ticker);
      for (const ticker of [...state.snapshotInFlight?.keys?.() || []]) if (!keep.has(ticker)) this.releaseRecoverySnapshotTicker(state,ticker,{resetAttempts:true});
      for (const ticker of [...state.snapshotAttempts?.keys?.() || []]) if (!keep.has(ticker)) state.snapshotAttempts.delete(ticker);
      for (const ticker of [...state.snapshotFloor?.keys?.() || []]) if (!keep.has(ticker)) state.snapshotFloor.delete(ticker);
      if (!state.tickers.size && !state.pendingSnapshots.size) this.orderbookStreams.delete(sid);
    }
    return removed;
  }

  // Authoritative DB / protection-guard / durable-watch sets are provided by
  // Engine. Discovery updates are not permitted to evict an active position.
  setProtectionPriority(openTickers=[],watchTickers=[]) {
    const open=new Set(Array.from(openTickers||[]).filter(Boolean));
    const watch=new Set();
    for(const ticker of Array.from(watchTickers||[]).filter(Boolean)){
      if(open.has(ticker))continue;
      // A finalized market has no executable book. Keeping it in the watch
      // set only feeds recovery retries and REST refreshes.
      if(finalStatus(this.quotes.get(ticker)))continue;
      watch.add(ticker);
    }
    this.protectionPriority={open,watch};
    this.setWanted([...this.discoveryWanted]);
  }

  pinOpenTicker(ticker) {
    if(!ticker)return;
    this.protectionPriority.open.add(String(ticker));
    this.setWanted([...this.discoveryWanted]);
  }

  noteProtectionEvaluation(ticker,at=Date.now()) {
    if(ticker && this.protectionPriority.open.has(String(ticker)))
      this.protectionEvaluations.set(String(ticker),at);
  }

  // Round-robin within each priority class. Under hard memory pressure, one
  // protected position and one recovery watch can both make progress; old
  // candidates cannot monopolize the fixed two maintenance slots.
  invalidBookMaintenanceCandidates(maximum,at) {
    const available=ticker=>{
      if(this.resyncing.has(ticker))return false;
      const q=this.quotes.get(ticker),b=this.books.get(ticker),r=this.tickerRecovery.get(ticker);
      // A proven terminal research market cannot trade. An open capital
      // position or durable recovery watch is NOT exempt from protection:
      // broker settlement can still be pending after public finalization.
      if(finalStatus(q)&&!this.protectionPriority.open.has(ticker)
        &&!this.protectionPriority.watch.has(ticker))return false;
      if(this.researchRetired(ticker))return false;
      return (!b||q?.bookInvalid||b?.sequenceValid===false)
        && at>=Number(r?.restNextAtMs||0) && at>=Number(r?.cooldownUntilMs||0);
    };
    const open=[...this.protectionPriority.open].filter(t=>this.wanted.has(t)&&available(t));
    const watch=[...this.protectionPriority.watch].filter(t=>this.wanted.has(t)
      &&!this.protectionPriority.open.has(t)&&available(t));
    const research=[...this.wanted].filter(t=>!this.protectionPriority.open.has(t)
      &&!this.protectionPriority.watch.has(t)&&available(t));
    const classes={open,watch,research}, cursors=this.runtimeMaintenance.invalidRefreshCursors;
    const chosen=[],used=new Set();
    const take=category=>{
      const group=classes[category];if(!group.length)return false;
      let index=Number(cursors[category]||0)%group.length;
      for(let n=0;n<group.length;n++){
        const ticker=group[(index+n)%group.length];
        if(used.has(ticker))continue;
        chosen.push(ticker);used.add(ticker);
        cursors[category]=(index+n+1)%group.length;
        return true;
      }
      return false;
    };
    if(chosen.length<maximum)take('open');
    if(chosen.length<maximum)take('watch');
    // Round-robin remaining work across priority classes, without allowing
    // research candidates to displace the reserved protected opportunities.
    let round=0;
    while(chosen.length<maximum && round<maximum*3+3){
      const previous=chosen.length;
      for(const category of ['open','watch','research']){
        if(chosen.length>=maximum)break;
        take(category);
      }
      if(chosen.length===previous)break;
      round++;
    }
    return chosen;
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
      const invalid=this.invalidBookMaintenanceCandidates(maximum,at);
      invalidBooksRefreshed=invalid.length;
      for(const ticker of invalid)void this.resyncBook(ticker).catch(()=>{});
    }
    const m=this.runtimeMaintenance;m.runs+=1;m.lastRunAtMs=at;m.prunedQuotes+=removed.quotes;m.prunedBooks+=removed.books;m.prunedHistories+=removed.histories;m.trimmedHistories+=trimmedHistories;m.staleCommandsReleased+=staleCommandsReleased;m.orphanDeltaBuffersReleased+=orphanDeltaBuffersReleased;m.invalidBooksRefreshed+=invalidBooksRefreshed;
    m.lastResult={atMs:at,pressureState,removed,trimmedHistories,staleCommandsReleased,orphanDeltaBuffersReleased,invalidBooksRefreshed,wanted:this.wanted.size};
    return m.lastResult;
  }

  noteConnectionEvent(type, detail={}) {
    const event={type,atMs:Date.now(),...detail};
    this.connectionDiagnostics.lastEvent=event;
    if(['recovery_reconnect','transport_error','stale_connection'].includes(type))
      this.connectionDiagnostics.lastFailure=event;
    if(type==='disconnected')this.connectionDiagnostics.lastDisconnect=event;
  }

  protectedMarketHealthSnapshot(now=Date.now()) {
    const open=this.protectionPriority.open;
    let fresh=0,missing=0,stale=0,invalid=0;
    const sample=[];
    for(const ticker of open){
      const q=this.quotes.get(ticker),book=this.books.get(ticker),recovery=this.tickerRecovery.get(ticker);
      const quoteAge=this.quoteAgeMs(ticker,now),bookAge=this.bookAgeMs(ticker,now);
      const valid=Boolean(q && !q.bookInvalid && book?.sequenceValid===true
        && book.yesBids?.length && book.noBids?.length
        && quoteAge<=MARKET_PROTECTED_MARK_FRESH_MS && bookAge<=MARKET_PROTECTED_MARK_FRESH_MS);
      const state=valid?'FRESH':!q||!book?'MISSING':q.bookInvalid||book.sequenceValid!==true?'INVALID':'STALE';
      if(valid)fresh++;else if(state==='MISSING')missing++;else if(state==='INVALID')invalid++;else stale++;
      if(sample.length<24)sample.push({ticker:this.safeRecoveryTicker(ticker),state,
        quoteAgeMs:Number.isFinite(quoteAge)?quoteAge:null,
        bookAgeMs:Number.isFinite(bookAge)?bookAge:null,
        lastProtectionEvaluationAgeMs:this.protectionEvaluations.has(ticker)
          ?Math.max(0,now-this.protectionEvaluations.get(ticker)):null,
        recoveryReason:recovery?.lastReason||null});
    }
    return {version:'MW-PROTECTED-MARKET-V1',observedAtMs:now,active:open.size,
      fresh,missing,invalid,stale,allFresh:fresh===open.size,sample};
  }

  queueMarketMembershipFlush() {
    if(this.wsMembershipFlushQueued)return;
    this.wsMembershipFlushQueued=true;
    queueMicrotask(()=>{this.wsMembershipFlushQueued=false;this.flushMarketMembership();});
  }

  beginMarketChannelSubscribe(channels,tickers) {
    const ws=this.ws;
    if(!this.connected||ws?.readyState!==WebSocket.OPEN)return false;
    const id=this.nextWsCommandId();
    const params={channels,market_tickers:tickers,
      ...(channels.includes('orderbook_delta')?{use_yes_price:false}:{})};
    this.wsSubscriptionCommands.set(id,new Set(channels));
    this.wsInitialMarketSubscriptions.set(id,{channels:new Set(channels),
      tickers:new Set(tickers),atMs:Date.now(),epoch:this.connectionEpoch});
    try{ws.send(JSON.stringify({id,cmd:'subscribe',params}));return true;}
    catch{this.forceRecoveryReconnect('membership_initial_subscription_send_failed');return false;}
  }

  flushMarketMembership() {
    const ws=this.ws;
    if(!this.connected||this.stopped||!ws||ws.readyState!==WebSocket.OPEN
      ||this.recoveryReconnectPending||this.wsMembershipCommands.size)return false;
    const wanted=[...this.wanted];
    if(!wanted.length && !this.wsMarketMembership.size)return false;
    const awaiting=new Set();
    for(const record of this.wsInitialMarketSubscriptions.values())
      for(const channel of record.channels)awaiting.add(channel);
    const missing=MARKET_MEMBERSHIP_CHANNELS.filter(channel=>!this.wsSubscriptions.has(channel));
    if(missing.length){
      // The engine may open its WS socket before its first discovery. Subscribe
      // missing channels later instead of waiting for a full reconnect.
      if(!wanted.length||missing.some(channel=>awaiting.has(channel)))return false;
      const side=missing.filter(c=>c!=='orderbook_delta');
      if(side.length&&!this.beginMarketChannelSubscribe(side,wanted))return false;
      if(missing.includes('orderbook_delta'))this.beginMarketChannelSubscribe(['orderbook_delta'],wanted);
      return true;
    }
    for(const channel of MARKET_MEMBERSHIP_CHANNELS){
      const sid=this.wsSubscriptions.get(channel),current=this.wsMarketMembership.get(channel);
      if(sid==null||!current)return false;
      // Do not defer a newly protected LIVE position's subscription behind
      // a research-market cooldown. A missing protected ticker must be
      // admitted immediately or rejected by the existing fail-closed guards.
      const newProtected=[...this.protectionPriority.open].some(t=>this.wanted.has(t)&&!current.has(t));
      if(!newProtected && Date.now()<Number(this.wsMembershipRetry.get(channel)?.nextAtMs||0))continue;
      const added=wanted.filter(t=>!current.has(t));
      const removed=[...current].filter(t=>!this.wanted.has(t));
      const action=added.length?'add_markets':removed.length?'delete_markets':null;
      if(!action)continue;
      const tickers=(added.length?added:removed).slice(0,SNAPSHOT_BATCH_SIZE);
      const id=this.nextWsCommandId();
      this.wsMembershipCommands.set(id,{channel,sid,action,tickers:new Set(tickers),
        atMs:Date.now(),epoch:this.connectionEpoch});
      try{ws.send(JSON.stringify({id,cmd:'update_subscription',params:
        {sids:[sid],market_tickers:tickers,action}}));}
      catch{
        this.wsMembershipCommands.delete(id);
        this.forceRecoveryReconnect('membership_update_send_failed');return false;
      }
      this.membershipStats[action==='add_markets'?'increments':'decrements']++;
      this.membershipStats.last={type:'sent',channel,action,count:tickers.length,atMs:Date.now()};
      return true;
    }
    return false;
  }

  acknowledgeMarketMembership(data) {
    const id=finiteInt(data?.id),command=id==null?null:this.wsMembershipCommands.get(id);
    if(!command)return false;
    this.wsMembershipCommands.delete(id);
    const sid=sidOf(data,data?.msg||{});
    if(sid!==command.sid||command.epoch!==this.connectionEpoch){
      this.membershipStats.errors++;
      this.forceRecoveryReconnect('membership_ack_identity_mismatch');return true;
    }
    const current=this.wsMarketMembership.get(command.channel);
    if(!current){this.forceRecoveryReconnect('membership_ack_missing_channel');return true;}
    // MW1-R2: Kalshi's OK response may contain the complete post-update market
    // membership. A matching SID alone is NOT evidence that every requested
    // open-position market was actually retained. Verify explicit server truth
    // before treating newly added markets as subscribed. Do not log tickers.
    const expected=new Set(current);
    for(const ticker of command.tickers){
      if(command.action==='add_markets')expected.add(ticker);
      else expected.delete(ticker);
    }
    if(Object.hasOwn(data?.msg||{},'market_tickers')){
      const reported=data.msg.market_tickers;
      const reportedSet=Array.isArray(reported)?new Set(reported):null;
      const validList=Boolean(reportedSet && reportedSet.size===reported.length
        && [...reportedSet].every(t=>typeof t==='string'&&t.length>0));
      const matches=Boolean(validList && reportedSet.size===expected.size
        && [...reportedSet].every(t=>expected.has(t)));
      if(!matches){
        this.membershipStats.errors++;
        // An invalid acknowledgement must never overwrite membership proof.
        // A real protected LIVE market missing from a valid full broker list
        // still requires the existing safe transport-recovery path.
        const openMissing=!validList || [...this.protectionPriority.open].some(t=>!reportedSet.has(t));
        if(openMissing){
          this.membershipStats.last={type:'ack_content_mismatch',channel:command.channel,
            action:command.action,atMs:Date.now()};
          this.forceRecoveryReconnect('membership_ack_content_mismatch');return true;
        }
        // Kalshi's acknowledged list represents confirmed POST-update
        // membership. Keep its exact value, not our unproven requested list.
        current.clear();for(const t of reportedSet)current.add(t);
        // No new timer or worker: the existing 5s maintenance cadence retries
        // research membership, with exponential bounded delay on repeats.
        const failures=Math.min(16,Number(this.wsMembershipRetry.get(command.channel)?.failures||0)+1);
        const delayMs=Math.min(60_000,1_000*2**Math.min(6,failures-1));
        this.wsMembershipRetry.set(command.channel,{failures,nextAtMs:Date.now()+delayMs});
        this.membershipStats.last={type:'ack_content_mismatch',channel:command.channel,
          action:command.action,atMs:Date.now(),retryDelayMs:delayMs};
        return true;
      }
    }
    this.wsMembershipRetry.delete(command.channel);
    for(const ticker of command.tickers){
      if(command.action==='add_markets')current.add(ticker);
      else current.delete(ticker);
    }
    this.membershipStats.acknowledgements++;
    this.membershipStats.last={type:'ack',channel:command.channel,action:command.action,
      count:command.tickers.size,atMs:Date.now()};
    this.queueMarketMembershipFlush();
    return true;
  }

  maintainMarketMembership(now=Date.now()) {
    if(!this.connected)return;
    const pending=[...this.wsMembershipCommands.values(),...this.wsInitialMarketSubscriptions.values()];
    if(pending.some(x=>now-Number(x.atMs||0)>MARKET_MEMBERSHIP_TIMEOUT_MS)){
      this.membershipStats.timeouts++;
      // A late ack is not a dead socket. Reconnecting here caused the 71
      // reconnects in the 14-hour run. Drop the command and retry. Reconnect
      // only when the socket itself has been silent.
      const silent=!this.lastMessageMs || now-this.lastMessageMs>30_000;
      if(silent){this.forceRecoveryReconnect('membership_ack_timeout');return;}
      // An ACK timeout on a live socket is not evidence of successful
      // subscription. Retry on the existing bounded maintenance cadence.
      for(const cmd of this.wsMembershipCommands.values()){
        const failures=Math.min(16,Number(this.wsMembershipRetry.get(cmd.channel)?.failures||0)+1);
        this.wsMembershipRetry.set(cmd.channel,{failures,
          nextAtMs:now+Math.min(60_000,1_000*2**Math.min(6,failures-1))});
      }
      this.wsMembershipCommands.clear();
      this.wsInitialMarketSubscriptions?.clear?.();
      return;
    }
    this.queueMarketMembershipFlush();
  }

  connectionHealthSnapshot() {
    return {...this.connectionDiagnostics,
      connected:this.connected===true && this.ws?.readyState===WebSocket.OPEN && !this.stopped,
      socketState:this.ws?.readyState??null,lastMessageMs:this.lastMessageMs,
      recoveryReconnectPending:this.recoveryReconnectPending,
      subscribedChannels:[...this.wsSubscriptions.keys()].sort(),
      recoveryReconnects:this.bookIntegrityStats.recoveryReconnects,
      sequenceGaps:this.bookIntegrityStats.sequenceGaps,
      recoveryRequests:this.bookIntegrityStats.recoveryRequests,
      tickerRecovery:this.recoveryHealthSnapshot(),
      membership:{...this.membershipStats,confirmed:[...this.wsMarketMembership].map(([channel,members])=>
        ({channel,count:members.size})),pending:this.wsMembershipCommands.size,
        initialPending:this.wsInitialMarketSubscriptions.size},
      protectedMarkets:this.protectedMarketHealthSnapshot()};
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
      quoteOrdering:{...this.observationStats,streamCursors:this.quoteStreamSequences?.size||0},
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
        tickerRecovery:this.recoveryHealthSnapshot(),
        recoveryBufferedDeltas,
        ...this.bookIntegrityStats,
      },
      cacheBoundedToWanted:true,
      runtimeMaintenance:{...this.runtimeMaintenance},
      protectedMarketData:this.protectedMarketHealthSnapshot(),
      backgroundRestRecovery:this.backgroundRestRecovery.snapshot(),
      r17Feed:{...this.r17FeedStats,watchCapacity:R17_FEED_POLICY.maximumWatchedTickers,
        priorityMissingRestCalls:this.priorityRestCalls,legacyWindowSize:this.legacyWatchWindow.length},
    };
  }

  // Only the R17 scanner owns this list. It consists of live, enabled,
  // matching-fingerprint WATCHING authorization tickers (not historical rows).
  // Unlike discoveryWanted it is NOT cleared by unrelated full-scan research.
  setR17WatchTickers(tickers){
    const next=new Set(Array.from(tickers||[]).filter(t=>typeof t==='string'&&t.length>0));
    const changed=next.size!==this.r17WatchTickers.size||[...next].some(t=>!this.r17WatchTickers.has(t));
    if(changed)this.r17WatchTickers=next;
    const rotationDue=next.size>R17_FEED_POLICY.maximumWatchedTickers
      &&Date.now()-this.r17WatchWindowAtMs>=R17_FEED_POLICY.rotationIntervalMs;
    if(changed||rotationDue)this.setWanted([...this.discoveryWanted]);
  }

  plannedWanted(tickers) {
    const discoveryWanted=new Set(Array.from(tickers||[]).filter(Boolean));
    const open=[...this.protectionPriority.open];
    const r17=[...this.r17WatchTickers].filter(t=>!this.protectionPriority.open.has(t)
      &&!finalStatus(this.quotes.get(t)));
    // Coherent multi-tick rebounds require a stable membership window; a
    // different 12-market slice on every full/fast scan loses quote continuity.
    // Only rotate on a bounded timer when demand exceeds the subscription cap.
    const now=Date.now();
    const changed=this.r17WatchWindow.some(t=>!r17.includes(t));
    const rollover=!this.r17WatchWindowAtMs||changed
      ||this.r17WatchWindow.length<Math.min(r17.length,R17_FEED_POLICY.maximumWatchedTickers)
      ||(r17.length>R17_FEED_POLICY.maximumWatchedTickers
        &&now-this.r17WatchWindowAtMs>=R17_FEED_POLICY.rotationIntervalMs);
    if(rollover){
      const isRotation=this.r17WatchWindowAtMs>0&&!changed&&r17.length>R17_FEED_POLICY.maximumWatchedTickers;
      if(isRotation){this.r17WatchCursor=(this.r17WatchCursor+R17_FEED_POLICY.maximumWatchedTickers)%r17.length;
        this.r17FeedStats.rotationCount++;}
      const selected=stableR17WatchWindow(r17,{cursor:this.r17WatchCursor});
      this.r17WatchWindow=selected.selected;
      this.r17WatchWindowAtMs=now;
    }
    const watch=[...this.r17WatchWindow];
    // Protected non-R17 recovery watches MUST NOT lose all WS slots when
    // R17 alone fills its 48-watch cohort. Rotate a separate stable subset.
    const otherWatches=[...this.protectionPriority.watch].filter(t=>
      !this.protectionPriority.open.has(t)&&!this.r17WatchTickers.has(t)
      &&!watch.includes(t)&&!finalStatus(this.quotes.get(t)));
    const legacyCap=Math.min(Math.max(R17_FEED_POLICY.legacyWatchCapacity,
      R17_FEED_POLICY.maximumWatchedTickers-watch.length),
      Math.max(0,R17_FEED_POLICY.maximumTotalNonFundedTickers
        -watch.length-R17_FEED_POLICY.minimumDiscoverySlots));
    const oldGone=this.legacyWatchWindow.some(t=>!otherWatches.includes(t));
    const legacyRoll=!this.legacyWatchWindowAtMs||oldGone
      ||this.legacyWatchWindow.length<Math.min(otherWatches.length,legacyCap)
      ||(otherWatches.length>legacyCap
        &&now-this.legacyWatchWindowAtMs>=R17_FEED_POLICY.rotationIntervalMs);
    if(legacyRoll){
      if(!oldGone&&this.legacyWatchWindowAtMs>0&&otherWatches.length>legacyCap)
        this.legacyWatchCursor=(this.legacyWatchCursor+legacyCap)%otherWatches.length;
      this.legacyWatchWindow=legacyCap?stableR17WatchWindow(otherWatches,
        {maximum:legacyCap,cursor:this.legacyWatchCursor}).selected:[];
      this.legacyWatchWindowAtMs=now;
    }
    watch.push(...this.legacyWatchWindow);
    const maximum=R17_FEED_POLICY.maximumTotalNonFundedTickers;
    const room=Math.max(0,maximum-watch.length);
    const discovery=[...discoveryWanted].filter(t=>!this.protectionPriority.open.has(t)
      &&!watch.includes(t)).slice(0,room);
    this.r17FeedStats.eligibleWatchTickers=r17.length;
    this.r17FeedStats.coveredWatchTickers=watch.filter(t=>this.r17WatchTickers.has(t)).length;
    this.r17FeedStats.subscriptionWindowAtMs=this.r17WatchWindowAtMs;
    return new Set([...open,...watch,...discovery]);
  }

  setWanted(tickers) {
    this.discoveryWanted=new Set(Array.from(tickers||[]).filter(Boolean));
    const next=this.plannedWanted(this.discoveryWanted);
    const changed=next.size!==this.wanted.size||[...next].some(t=>!this.wanted.has(t));
    this.wanted=next;
    // Never evict an open capital or durable-watch ticker solely because
    // research discovery changed. The engine alone retires protected identity.
    this.pruneUnusedCaches(next);
    for(const ticker of [...this.protectionEvaluations.keys()])
      if(!this.protectionPriority.open.has(ticker))this.protectionEvaluations.delete(ticker);
    if(changed && this.ws && this.connected){
      this.membershipStats.preventedReconnects++;
      this.queueMarketMembershipFlush();
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
    const priorAt=Number(merged.quoteAtMs||merged.updatedAtMs||0);
    if (priorAt > bookAt) return {...merged, bookInvalid:false};
    return {
      ...merged,yesBid:bid.priceCents,yesAsk:ask.priceCents,yesBidSize:bid.count,yesAskSize:ask.count,
      quoteAtMs:Math.max(priorAt,bookAt),
      updatedAtMs:Math.max(Number(merged.updatedAtMs||0),bookAt),bookInvalid:false,
    };
  }

  executableBidFromBook(book, count, limitCents = null) {
    if(!book?.yesBids?.length||book.sequenceValid===false)return null;
    if(!decimal(count)||!(Number(count)>0)||!Number.isFinite(Number(count)))return null;
    if(limitCents!=null&&(!decimal(limitCents)||!Number.isFinite(Number(limitCents))))return null;
    const limit=limitCents==null?-Infinity:Number(limitCents);
    const out=walkLevels(book.yesBids,count,(x)=>x.priceCents>=limit);
    return {...out,bestCents:book.yesBids[0]?.priceCents??null};
  }

  executableAskFromBook(book, count, limitCents = null) {
    if(!book?.noBids?.length||book.sequenceValid===false)return null;
    if(!decimal(count)||!(Number(count)>0)||!Number.isFinite(Number(count)))return null;
    if(limitCents!=null&&(!decimal(limitCents)||!Number.isFinite(Number(limitCents))))return null;
    const asks=yesAsksFromNoBids(book.noBids);
    const limit=limitCents==null?Infinity:Number(limitCents);
    const out=walkLevels(asks,count,(x)=>x.priceCents<=limit);
    return {...out,bestCents:asks[0]?.priceCents??null};
  }

  // MHF5: execution verification is intentionally non-destructive. A REST
  // proof may be newer than the websocket cache, but it must never replace a
  // sequence-aligned WS book merely because an entry candidate is being
  // revalidated. Callers receive the fresh REST quote/book directly.
  async verifyTickerSnapshot(ticker,{maxAgeMs}={}) {
    const now=Date.now(),requestEpoch=this.connectionEpoch;
    const limited=maxAgeMs!=null&&Number.isFinite(Number(maxAgeMs))&&Number(maxAgeMs)>=0;
    const limit=limited?Number(maxAgeMs):null;
    const freshAt=(at,checkAt=Date.now())=>Number(at)>0&&checkAt-Number(at)>=-2000&&checkAt-Number(at)<=limit;
    const project=value=>{
      if(requestEpoch!==this.connectionEpoch)return {...value,book:null,marketFresh:false,bookFresh:false,
        marketObservedAtMs:0,bookObservedAtMs:0,canonicalBookMutated:false,
        requestEpoch,verificationSource:'connection_epoch_changed'};
      if(!limited)return value;
      // Only the caller's freshness contract changes. Keep the actual receipt
      // clocks; neither cache hits nor delayed sibling requests mint evidence.
      return {...value,marketFresh:value?.marketFresh===true&&freshAt(value.marketObservedAtMs),
        bookFresh:value?.bookFresh===true&&freshAt(value.bookObservedAtMs)};
    };
    const cached=this.snapshotCache?.get(ticker),latest=this.quotes.get(ticker);
    const ttl=this.protectionPriority?.open?.has(ticker)?2500:30_000;
    const newerCanonical=Number(latest?.quoteObservation?.revision||0)
      >Number(cached?.value?.quote?.quoteObservation?.revision||cached?.value?.requestRevision||0);
    const lifecycleChanged=latest&&cached?.value?.quote&&(
      String(latest.eventTicker||latest.ticker)!==String(cached.value.quote.eventTicker||cached.value.quote.ticker)
      ||terminalMarketEvidence(latest)&&!terminalMarketEvidence(cached.value.quote)
      ||newerCanonical&&(!cached.value.marketFresh||!cached.value.bookFresh));
    const cacheAge=now-Number(cached?.atMs||0);
    const evidenceWithinLimit=!limited||(
      (!cached?.value?.marketFresh||freshAt(cached.value.marketObservedAtMs,now))
      &&(!cached?.value?.bookFresh||freshAt(cached.value.bookObservedAtMs,now)));
    if(cached&&cached.epoch===requestEpoch&&!lifecycleChanged&&cacheAge>=0&&cacheAge<ttl
      &&(!limited||cacheAge<=limit)&&evidenceWithinLimit)return project(cached.value);
    // Share the original verification only inside its connection epoch. A
    // reconnect fences both completed cache entries and in-flight responses.
    const flightKey=`${requestEpoch}:${ticker}`;
    const previous=this.verificationInFlight.get(flightKey);
    if(previous)return project(await previous);
    const pending=this.verifyTickerSnapshotUnshared(ticker);
    this.verificationInFlight.set(flightKey,pending);
    try{return project(await pending);}
    finally{if(this.verificationInFlight.get(flightKey)===pending)this.verificationInFlight.delete(flightKey);}
  }

  async sharedRestOrderbook(ticker) {
    const epoch=this.connectionEpoch;
    const current=this.restOrderbookInFlight.get(ticker);
    if(current?.epoch===epoch)return current.pending;
    // Dispatch at most one raw REST read per ticker and connection epoch.
    // Unlike snapshotCache, this keeps no completed or time-extended evidence.
    // Rejection is preserved; the two consumers make their OWN trust decisions.
    const pending=Promise.resolve().then(()=>this.kalshi.getOrderbook(ticker));
    const record={epoch,pending};
    this.restOrderbookInFlight.set(ticker,record);
    try{return await pending;}
    finally{if(this.restOrderbookInFlight.get(ticker)===record)this.restOrderbookInFlight.delete(ticker);}
  }

  async verifyTickerSnapshotUnshared(ticker) {
    const requestEpoch=this.connectionEpoch;
    const requestRevision=this.quoteRevision;
    const [marketResult,bookResult]=await Promise.allSettled([
      Promise.resolve().then(()=>this.kalshi.getMarket(ticker)).then(value=>({value,observedAtMs:Date.now()})),
      this.sharedRestOrderbook(ticker).then(value=>({value,observedAtMs:Date.now()})),
    ]);
    const marketQuote=marketResult.status==='fulfilled'?marketResult.value.value:null;
    const rawBook=bookResult.status==='fulfilled'?bookResult.value.value:null;
    const book=this.trustedRestBook(rawBook);
    const marketObservedAtMs=marketQuote?Number(marketResult.value.observedAtMs):0;
    const bookObservedAtMs=book?Number(book.updatedAtMs||bookResult.value.observedAtMs):0;
    const latest=this.quotes.get(ticker),latestBook=this.books.get(ticker);
    // A newer price-only WS revision cannot erase a definitive REST market
    // close/result. Preserve terminal evidence from either source while
    // keeping the canonical WS quote and sequence-aligned book untouched.
    if(!terminalMarketEvidence(marketQuote)&&(Number(latest?.quoteObservation?.revision||0)>Number(requestRevision||0)
      ||terminalMarketEvidence(latest))){
      const coherent=latestBook?.sequenceValid!==false && latestBook?.updatedAtMs && !latest.bookInvalid
        && Number(latestBook.yesBids?.[0]?.priceCents)===Number(latest.yesBid)
        && Number(100-latestBook.noBids?.[0]?.priceCents)===Number(latest.yesAsk);
      const value={quote:latest,book:coherent?latestBook:null,marketFresh:!latest.bookInvalid,bookFresh:Boolean(coherent),marketObservedAtMs:quoteObservedAt(latest),bookObservedAtMs:coherent?latestBook.updatedAtMs:0,canonicalBookMutated:false,requestRevision,requestEpoch,verificationSource:'newer_canonical'};
      // An old connection's slow result cannot seed the new epoch cache.
      // The public verification wrapper also withdraws its freshness flags.
      if(requestEpoch===this.connectionEpoch){
        if(!(this.snapshotCache instanceof Map))this.snapshotCache=new Map();
        this.snapshotCache.set(ticker,{atMs:Date.now(),epoch:requestEpoch,value});
        if(this.snapshotCache.size>400){const first=this.snapshotCache.keys().next().value;this.snapshotCache.delete(first);}
      }
      return value;
    }
    const quote=this.quoteFromVerifiedBook(ticker,marketQuote,book,Math.max(marketObservedAtMs,bookObservedAtMs,Date.now()));
    const value={quote,book,marketFresh:Boolean(marketQuote),bookFresh:Boolean(book),marketObservedAtMs,bookObservedAtMs,canonicalBookMutated:false,requestRevision,requestEpoch};
    if(requestEpoch===this.connectionEpoch){
      if(!(this.snapshotCache instanceof Map))this.snapshotCache=new Map();
      this.snapshotCache.set(ticker,{atMs:Date.now(),epoch:requestEpoch,value});
      if(this.snapshotCache.size>400){const first=this.snapshotCache.keys().next().value;this.snapshotCache.delete(first);}
    }
    return value;
  }

  async refreshTickerVerified(ticker,options={}) {
    const verified=await this.verifyTickerSnapshot(ticker,options);
    if(verified.marketFresh&&verified.quote)this.seed({...verified.quote,restMarketObservedAtMs:verified.marketObservedAtMs},{requestRevision:verified.requestRevision});
    let mutated=false;
    if(verified.verificationSource!=='newer_canonical' && verified.bookFresh&&verified.book && Number(this.books.get(ticker)?.updatedAtMs||0)<=Number(verified.book.updatedAtMs||0)){this.books.set(ticker,verified.book);this.applyBook(ticker);mutated=true;}
    return {...verified,quote:this.quotes.get(ticker)||verified.quote||null,canonicalBookMutated:mutated};
  }

  async refreshTicker(ticker,options={}) {
    return (await this.refreshTickerVerified(ticker,options)).quote;
  }

  async ensureFreshBook(ticker, maxAgeMs = 5000) {
    const q = this.getQuote(ticker);
    const book = this.getBook(ticker);
    if (!book || this.bookAgeMs(ticker) > maxAgeMs || !q || q.bookInvalid || book.sequenceValid===false) await this.refreshTicker(ticker,{maxAgeMs}).catch(() => null);
    return this.getBook(ticker) || null;
  }

  async resyncBook(ticker) {
    if(this.researchRetired(ticker))return null;
    const recovery=this.tickerRecoveryState(ticker),now=Date.now();
    if(this.resyncing.has(ticker)||now<Math.max(recovery.restNextAtMs,recovery.cooldownUntilMs)){
      this.bookIntegrityStats.recoveryRestDeferrals++;return null;
    }
    // One coalesced slot per ticker, including WAITING time. Open positions and
    // durable watches get dispatch precedence; research is shed on overload.
    // No synthetic book, freshness, or broker order authority is manufactured.
    this.resyncing.add(ticker);
    const priority=()=>this.protectionPriority.open.has(ticker)?0
      :this.protectionPriority.watch.has(ticker)?1:2;
    const queuedBook=this.books.get(ticker),queuedBookAt=Number(queuedBook?.updatedAtMs||0);
    const needed=()=>{
      if(!this.wanted.has(ticker)
        ||(finalStatus(this.quotes.get(ticker))&&priority()===2))return false;
      // A newer sequence-validated WS book makes an old background REST
      // intent obsolete. Never spend tokens on a book already recovered.
      const current=this.books.get(ticker),q=this.quotes.get(ticker);
      if(current?.sequenceValid===true&&current.source==='WS'&&!q?.bookInvalid
        &&Number(current.updatedAtMs||0)>queuedBookAt
        &&this.bookAgeMs(ticker)<=5000)return false;
      return true;
    };
    try {
      const result=await this.backgroundRestRecovery.submit({ticker,priority,needed,work:async()=>{
        const dispatchedAt=Date.now();
        if(!needed()||dispatchedAt<Math.max(recovery.restNextAtMs,recovery.cooldownUntilMs))return null;
        // Pacing begins at actual dispatch, not when research is placed on a
        // queue. Never substitute queued elapsed time for market freshness.
        recovery.restNextAtMs=dispatchedAt+RECOVERY_SNAPSHOT_TIMEOUT_MS;
        const oldQuote=this.quotes.get(ticker),oldBook=this.books.get(ticker),epoch=this.connectionEpoch;
        const oldSeq=oldBook?.seq,oldTime=oldBook?.updatedAtMs;
        const raw=await this.sharedRestOrderbook(ticker),b=this.trustedRestBook(raw);
        if(!b)return null;
        if(epoch!==this.connectionEpoch||this.quotes.get(ticker)!==oldQuote||this.books.get(ticker)!==oldBook
          ||oldBook?.seq!==oldSeq||oldBook?.updatedAtMs!==oldTime)return null;
        this.books.set(ticker,b);this.applyBook(ticker);return b;
      }});
      return result;
    } catch {
      // Background recovery failure is not execution proof or a live-entry
      // permission. Existing broker read provenance is retained by the client.
      return null;
    } finally {this.resyncing.delete(ticker);}
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
    if (!bid || !ask) {
      // No liquidity is NOT missing sequence history. Keep the proven native
      // book (including an empty side) so the next contiguous delta can refill
      // it. This ticker remains non-executable; do not turn ordinary depletion
      // into snapshot retries and a disconnect of every other market.
      this.quotes.set(ticker, { ...old, bookInvalid: !finalStatus(old) });
      return;
    }
    if (bid.priceCents > ask.priceCents) {
      if (book.source==='WS') { book.sequenceValid=false; book.invalidReason='crossed_book'; }
      this.quotes.set(ticker, { ...old, bookInvalid: !finalStatus(old) });
      if(!finalStatus(old)){
        const state=book.source==='WS'?this.streamState(finiteInt(book.sid)):null;
        if(state)this.startSingleTickerRecovery(state,ticker,'crossed_book');
        else void this.resyncBook(ticker).catch(()=>{});
      }
      return;
    }
    const observedAtMs=Number(book.updatedAtMs || 0);
    const priorAt=Number(old.quoteAtMs || old.updatedAtMs || 0);
    if (priorAt > observedAtMs) {
      // Do not roll a newer quote back. A complete proven book with exactly
      // matching top prices can, however, remove its former empty-book veto.
      if (old.bookInvalid && book.sequenceValid!==false
        && Number(old.yesBid)===bid.priceCents && Number(old.yesAsk)===ask.priceCents)
        this.quotes.set(ticker,{...old,bookInvalid:false});
      return;
    }
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
    this.publishQuote(q,{source:book.source==='WS'?'WS_BOOK':'REST_BOOK',stream:book.source==='WS'?`${this.connectionEpoch}:${book.sid}`:'',sequence:book.source==='WS'?book.seq:null,emit:true});
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
    if(this.backgroundRestRecovery.closed)this.backgroundRestRecovery=new BackgroundBookRecovery();
    if (!this.connectLoopRunning) void this.connectLoop();
  }
  stop() {
    // Cancel WAITING background work only. An already issued REST request is
    // still reconciled by the original source/epoch checks, not aborted.
    this.backgroundRestRecovery.close();
    this.stopped = true;
    this.connected = false;
    this.noteConnectionEvent('stopped');
    this.onStatus(false,this.lastMessageMs);
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
      state={sid,lastSeq:0,tickers:new Set(),pendingSnapshots:new Set(),pendingDeltas:new Map(),recoveryOverflow:new Set(),snapshotInFlight:new Map(),snapshotAttempts:new Map(),snapshotFloor:new Map(),recovering:false};
      this.orderbookStreams.set(sid,state);
    }
    if(state){
      if(!state.pendingDeltas)state.pendingDeltas=new Map();
      if(!state.recoveryOverflow)state.recoveryOverflow=new Set();
      if(!state.snapshotInFlight)state.snapshotInFlight=new Map();
      if(!state.snapshotAttempts)state.snapshotAttempts=new Map();
      if(!state.snapshotFloor)state.snapshotFloor=new Map();
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
    this.noteConnectionEvent('recovery_reconnect',{reason:String(reason).slice(0,120)});
    this.connected=false;
    this.onStatus(false,this.lastMessageMs);
    try{ws.close(1012,String(reason).slice(0,120));return true;}
    catch{try{ws.terminate?.();}catch{}return false;}
  }

  tickerRecoveryState(ticker) {
    let record=this.tickerRecovery.get(ticker);
    if(!record){record={attempts:0,cycles:0,nextRequestAtMs:0,cooldownUntilMs:0,restNextAtMs:0,
      lastFailureAtMs:0,lastReason:null};this.tickerRecovery.set(ticker,record);}
    return record;
  }

  recoveryHealthSnapshot(now=Date.now()) {
    const cooling=[...this.tickerRecovery].filter(([,r])=>r.cooldownUntilMs>now);
    // R5 observability only. The raw cooling count includes OLD research
    // markets and MUST NOT be read as the number of blocked LIVE positions.
    // Never use these labels to admit an order or declare a book executable.
    const groups={protectedOpen:0,durableWatch:0,terminalUnprotectedResearch:0,
      activeUnprotectedResearch:0,otherUnprotectedResearch:0};
    for(const [ticker] of cooling){
      if(this.protectionPriority.open.has(ticker))groups.protectedOpen++;
      else if(this.protectionPriority.watch.has(ticker))groups.durableWatch++;
      else if(finalStatus(this.quotes.get(ticker)))groups.terminalUnprotectedResearch++;
      else if(String(this.quotes.get(ticker)?.status||'').toLowerCase()==='active')groups.activeUnprotectedResearch++;
      else groups.otherUnprotectedResearch++;
    }
    return {tracked:this.tickerRecovery.size,cooling:cooling.length,
      coolingClassificationVersion:'R5-COHORT-OBSERVABILITY',coolingByRole:groups,
      lastFailure:this.lastRecoveryFailure,
      sample:cooling.slice(0,8).map(([ticker,r])=>({ticker:this.safeRecoveryTicker(ticker),attempts:r.attempts,
        cycles:r.cycles,cooldownUntilMs:r.cooldownUntilMs,reason:r.lastReason}))};
  }

  safeRecoveryTicker(ticker) {
    return typeof ticker==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(ticker)?ticker:'invalid_ticker';
  }

  noteRecoveryFailure(state,ticker,reason,msg=null,now=Date.now()) {
    const r=this.tickerRecoveryState(ticker);
    r.lastReason=reason;r.lastFailureAtMs=now;
    const fields=msg?{}:(r.lastFields||{});
    if(msg&&typeof msg==='object')for(const key of ['market_id','yes_dollars_fp','no_dollars_fp','yes_dollars','no_dollars','yes','no']){
      const value=msg[key];
      fields[key]=!Object.hasOwn(msg,key)?{type:'absent'}:Array.isArray(value)?{type:'array',length:value.length}
        :key==='market_id'&&typeof value==='string'?{type:'string',length:value.length,nonempty:Boolean(value.trim())}
        :{type:value===null?'null':typeof value};
    }
    if(msg){r.lastFields=fields;r.validationReason=reason;}
    this.lastRecoveryFailure={atMs:now,ticker:this.safeRecoveryTicker(ticker),reason,validationReason:r.validationReason||null,
      sid:finiteInt(state?.sid),cursor:finiteInt(state?.lastSeq),attempts:r.attempts,
      cooldownUntilMs:r.cooldownUntilMs,marketStatus:String(this.quotes.get(ticker)?.status||'').slice(0,32),fields};
  }

  retireFailedResearch(state,ticker){
    const failed=this.tickerRecovery.get(ticker);
    if(!failed||failed.cycles<4)return false;
    if(this.protectionPriority.open.has(ticker)||this.protectionPriority.watch.has(ticker))return false;
    state?.pendingSnapshots?.delete(ticker);
    this.releaseRecoverySnapshotTicker(state,ticker,{resetAttempts:true});
    this.tickerRecovery.delete(ticker);
    // Hold the quiet period so invalid-book maintenance cannot restart the
    // same failed research market a minute later. Open/watch always bypass.
    if(!(this.retiredResearchUntil instanceof Map))this.retiredResearchUntil=new Map();
    this.retiredResearchUntil.set(ticker,Date.now()+10*60*1000);
    if(this.retiredResearchUntil.size>500){const first=this.retiredResearchUntil.keys().next().value;this.retiredResearchUntil.delete(first);}
    return true;
  }

  researchRetired(ticker){
    if(this.protectionPriority.open.has(ticker)||this.protectionPriority.watch.has(ticker))return false;
    const until=this.retiredResearchUntil?.get(ticker)||0;
    if(until && Date.now()<until)return true;
    if(until)this.retiredResearchUntil.delete(ticker);
    return false;
  }

  coolDownTicker(state,ticker,reason,now=Date.now()) {
    const r=this.tickerRecoveryState(ticker);
    if(r.cooldownUntilMs>now)return;
    r.cycles=Math.min(r.cycles+1,16);
    r.cooldownUntilMs=now+Math.min(RECOVERY_COOLDOWN_MS*2**Math.min(r.cycles-1,3),RECOVERY_COOLDOWN_MAX_MS);
    r.nextRequestAtMs=r.cooldownUntilMs;
    this.releaseRecoverySnapshotTicker(state,ticker);
    // Dropped deltas must never let an old snapshot falsely heal this book.
    state.pendingDeltas?.set(ticker,[]);state.recoveryOverflow?.add(ticker);
    this.bookIntegrityStats.recoveryCooldowns++;
    this.noteRecoveryFailure(state,ticker,reason,null,now);
    this.invalidateTickerBook(ticker,reason);
  }

  maintainRecovery(now=Date.now()) {
    for(const state of this.orderbookStreams.values()){
      for(const [ticker,flight] of [...state.snapshotInFlight.entries()]){
        if(now-Number(flight?.requestedAtMs||0)<=RECOVERY_SNAPSHOT_TIMEOUT_MS)continue;
        this.bookIntegrityStats.recoverySnapshotTimeouts++;
        this.releaseRecoverySnapshotTicker(state,ticker);
        this.noteRecoveryFailure(state,ticker,'orderbook_recovery_snapshot_timeout',null,now);
        // The failure is this ticker's evidence, not proof that the shared
        // account/private channels or every other market have disconnected.
        const r=this.tickerRecoveryState(ticker);
        if(r.attempts>=RECOVERY_SNAPSHOT_MAX_ATTEMPTS){
          this.coolDownTicker(state,ticker,'orderbook_recovery_snapshot_timeout',now);
          this.retireFailedResearch(state,ticker);
        }else if(this.protectionPriority.open.has(ticker)||this.protectionPriority.watch.has(ticker)){
          void this.resyncBook(ticker);
        }
      }
      if(state.pendingSnapshots.size)this.requestStreamSnapshots(state,now);
    }
    return !this.recoveryReconnectPending;
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
        // Snapshots predating the observed continuity break cannot cover the
        // missing segment, even when later deltas happen to be buffered.
        const floor=state.lastSeq+(['missing_sid_or_sequence','sid_mismatch'].includes(reason)?1:0);
        state.snapshotFloor.set(ticker,Math.max(Number(state.snapshotFloor.get(ticker)||0),floor));
        state.pendingDeltas?.set?.(ticker,[]);
        state.recoveryOverflow?.delete?.(ticker);
      }
    }
    state.recovering=true;
    this.requestStreamSnapshots(state);
  }

  requestStreamSnapshots(state,now=Date.now()) {
    if(!state||!state.pendingSnapshots.size||this.recoveryReconnectPending)return false;
    const ws=this.ws;
    if(!ws||!this.connected||typeof ws.send!=='function'||ws.readyState!==WebSocket.OPEN)return false;
    const eligible=[];
    for(const ticker of state.pendingSnapshots){
      if(state.snapshotInFlight.has(ticker))continue;
      // Suspend (do not claim healed) terminal non-capital research books.
      // Retain pending state so a later verified capital owner/watch can
      // request a snapshot without fabricating any sequence continuity.
      if(finalStatus(this.quotes.get(ticker))
        &&!this.protectionPriority.open.has(ticker)){
        this.protectionPriority.watch.delete(ticker);
        this.releaseRecoverySnapshotTicker(state,ticker,{resetAttempts:true});
        this.tickerRecovery.delete(ticker);
        continue;
      }
      const r=this.tickerRecoveryState(ticker);
      r.attempts=Math.max(r.attempts,Number(state.snapshotAttempts.get(ticker)||0));
      if(r.cooldownUntilMs){
        if(now<r.cooldownUntilMs)continue;
        r.attempts=0;r.cooldownUntilMs=0;state.snapshotAttempts.delete(ticker);
      }
      if(r.attempts>=RECOVERY_SNAPSHOT_MAX_ATTEMPTS){
        this.coolDownTicker(state,ticker,'orderbook_recovery_snapshot_attempts_exhausted',now);
        this.retireFailedResearch(state,ticker);
        continue;
      }
      if(now>=r.nextRequestAtMs)eligible.push(ticker);
    }
    if(!eligible.length||now-this.lastRecoveryDispatchAtMs<RECOVERY_COMMAND_INTERVAL_MS)return false;
    // MW1-R2: pendingSnapshots preserves arrival order, NOT financial priority.
    // On a crowded SID a late open capital position must not wait behind
    // hundreds of failing discovery books. Sort only the eligible request set;
    // do not bypass existing cooldown, single-flight or sequence checks.
    const priority=ticker=>this.protectionPriority.open.has(ticker)?0
      :this.protectionPriority.watch.has(ticker)?1:2;
    eligible.sort((a,b)=>priority(a)-priority(b));
    const capacity=RECOVERY_COMMANDS_IN_FLIGHT-this.recoverySnapshotCommands.size;
    if(capacity<=0)return false;
    const tickers=eligible.slice(0,capacity*SNAPSHOT_BATCH_SIZE);
    this.bookIntegrityStats.recoveryRequests++;
    this.lastRecoveryDispatchAtMs=now;
    for(let i=0;i<tickers.length;i+=SNAPSHOT_BATCH_SIZE){
      const batch=tickers.slice(i,i+SNAPSHOT_BATCH_SIZE),requestId=this.nextWsCommandId();
      const command={requestId,sid:state.sid,tickers:new Set(batch),requestedAtMs:now};
      this.recoverySnapshotCommands.set(requestId,command);
      for(const ticker of batch){
        const r=this.tickerRecoveryState(ticker);r.attempts++;
        r.nextRequestAtMs=now+Math.min(1000*2**(r.attempts-1),RECOVERY_SNAPSHOT_TIMEOUT_MS);
        state.snapshotInFlight.set(ticker,{requestId,requestedAtMs:now});state.snapshotAttempts.set(ticker,r.attempts);
      }
      this.bookIntegrityStats.recoveryBatches++;
      try {
        ws.send(JSON.stringify({id:requestId,cmd:'update_subscription',params:{sids:[state.sid],market_tickers:batch,action:'get_snapshot'}}));
      } catch {
        this.bookIntegrityStats.recoverySnapshotErrors++;
        for(const ticker of batch){this.releaseRecoverySnapshotTicker(state,ticker);this.noteRecoveryFailure(state,ticker,'snapshot_request_send_failed',null,now);}
        // A failed socket send IS transport-wide, unlike a rejected market book.
        this.forceRecoveryReconnect('snapshot_request_send_failed');return false;
      }
    }
    return true;
  }

  bufferRecoveryDelta(state,ticker,data) {
    if(!state||!ticker||!data)return false;
    if(!state.pendingDeltas)state.pendingDeltas=new Map();
    if(!state.recoveryOverflow)state.recoveryOverflow=new Set();
    if(Number(this.tickerRecovery.get(ticker)?.cooldownUntilMs||0)>Date.now()){
      state.recoveryOverflow.add(ticker);this.bookIntegrityStats.recoveryDeltaDrops++;return false;
    }
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
    const side=String(msg.side||'').toLowerCase();
    if(!['yes','no'].includes(side))return false;
    const nativeSide=side==='no'?book.noBids:book.yesBids;
    if(!Array.isArray(nativeSide))return false;
    const price=cents(msg.price_dollars);
    const rawDelta=msg.delta_fp??msg.delta;
    if(!contractUnits(rawDelta,{signed:true}))return false;
    const delta=Number(rawDelta);
    if(!(price>0&&price<100)||!Number.isFinite(delta))return false;
    const found=nativeSide.find((x)=>x.priceCents===price);
    const next=Number(found?.count||0)+delta;
    // An overdraw proves missing/corrupt depth. Discarding the level silently
    // would leave the rest of an unproven book executable.
    if(!Number.isFinite(next)||next < -1e-9||!contractUnits(Math.max(0,next)))return false;
    const clean=nativeSide.filter(x=>x!==found).map(x=>({...x}));
    if(next>1e-9)clean.push({priceCents:price,count:Math.round(next*100)/100});
    clean.sort((a,b)=>b.priceCents-a.priceCents);
    if(side==='no')book.noBids=clean;else book.yesBids=clean;
    book.updatedAtMs=Math.max(Number(book.updatedAtMs||0),Number(msg.ts_ms)||Date.now());
    if(seq!=null)book.seq=seq;
    return true;
  }

  applyRecoverySnapshot(state,ticker,sid,seq,msg) {
    if(!state||!ticker||sid==null||seq==null)return false;
    this.releaseRecoverySnapshotTicker(state,ticker);
    const buffered=(state.pendingDeltas?.get?.(ticker)||[]).slice().sort((a,b)=>Number(a.seq||0)-Number(b.seq||0));
    const overflow=Boolean(state.recoveryOverflow?.has?.(ticker));
    if(seq<Number(state.snapshotFloor?.get?.(ticker)||0)){
      this.noteRecoveryFailure(state,ticker,'snapshot_predates_stream_gap',msg);
      this.requestStreamSnapshots(state);return false;
    }
    if(overflow&&seq<state.lastSeq){
      // We cannot prove that every ignored delta after this stale snapshot is
      // still buffered. Stay fail-closed and ask Kalshi for a newer snapshot.
      state.pendingDeltas.set(ticker,[]);
      // Keep the incomplete-buffer marker until a snapshot reaches the cursor.
      state.recoveryOverflow.add(ticker);
      this.noteRecoveryFailure(state,ticker,'recovery_delta_buffer_incomplete',msg);
      this.requestStreamSnapshots(state);
      return false;
    }
    const invalidSnapshot=reason=>{
      state.tickers.add(ticker);state.pendingSnapshots.add(ticker);state.recovering=true;
      this.noteRecoveryFailure(state,ticker,reason,msg);
      this.invalidateTickerBook(ticker,reason);this.requestStreamSnapshots(state);return false;
    };
    // A full snapshot may omit a side with no offers. Omission is different
    // from an explicitly null/malformed canonical side: only omission becomes
    // empty; malformed canonical values never fall back to a deprecated alias.
    // With neither side present, require the documented market identity too,
    // so a truncated ticker-only payload cannot erase an existing live book.
    const hasSide=['yes_dollars_fp','no_dollars_fp','yes_dollars','no_dollars'].some(k=>Object.hasOwn(msg,k));
    if(!hasSide && !(typeof msg.market_id==='string' && msg.market_id.trim()))
      return invalidSnapshot('snapshot_identity_or_levels_missing');
    const sideLevels=name=>Object.hasOwn(msg,`${name}_dollars_fp`)?msg[`${name}_dollars_fp`]
      :Object.hasOwn(msg,`${name}_dollars`)?msg[`${name}_dollars`]
      :Object.hasOwn(msg,name)?null:[];
    const yesBids=parseLevels(sideLevels('yes'));
    const noBids=parseLevels(sideLevels('no'));
    if(!yesBids||!noBids)return invalidSnapshot('invalid_snapshot_levels');
    const book={
      ticker,
      yesBids,noBids,
      updatedAtMs:Number(msg.ts_ms)||Date.now(),
      source:'WS',sid,seq,sequenceValid:true,invalidReason:null,
    };
    for(const row of buffered){
      if(Number(row.seq||0)<=Number(seq))continue;
      if(!this.applyDeltaToBook(book,row.msg,row.seq))return invalidSnapshot('invalid_recovery_delta');
      this.bookIntegrityStats.recoveryReplayedDeltas+=1;
    }
    // A parseable but crossed book is not successful recovery. Otherwise each
    // bad snapshot clears its retry history before applyBook invalidates it.
    if(book.yesBids.length&&book.noBids.length
      &&book.yesBids[0].priceCents>100-book.noBids[0].priceCents)
      return invalidSnapshot('crossed_snapshot_book');
    this.books.set(ticker,book);
    state.tickers.add(ticker);
    state.pendingSnapshots.delete(ticker);
    state.pendingDeltas?.delete?.(ticker);
    state.recoveryOverflow?.delete?.(ticker);
    state.snapshotAttempts?.delete?.(ticker);
    state.snapshotFloor?.delete?.(ticker);
    this.tickerRecovery.delete(ticker);
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
    if(this.researchRetired(ticker))return;
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

  nextReconnectAttempt(previous,outcome=null) {
    if(outcome?.cause==='subscription_refresh'||Number(outcome?.connectedForMs||0)>=RECONNECT_STABLE_MS)return 0;
    return Math.min(Number(previous||0)+1,5);
  }

  async connectLoop() {
    if(this.connectLoopRunning)return;
    this.connectLoopRunning=true;
    let attempt=0;
    try {
      while(!this.stopped){
        if(!this.getCredentials()?.keyId){await sleep(2000);continue;}
        const token=this.reconnectToken;
        const urls=[this.wsUrl,this.fallbackWsUrl].filter((x,i,a)=>x&&a.indexOf(x)===i);
        try {
          const outcome=await this.connectOnce(urls[Math.min(attempt,urls.length-1)]||this.wsUrl,token);
          attempt=this.nextReconnectAttempt(attempt,outcome);
        } catch {attempt=this.nextReconnectAttempt(attempt);}
        const delay=Math.min(1000*2**attempt,30000);
        this.connectionDiagnostics.reconnectAttempt=attempt;
        this.connectionDiagnostics.nextReconnectDelayMs=this.stopped?0:delay;
        if(!this.stopped)await sleep(delay);
      }
    } finally {this.connectLoopRunning=false;}
  }

  connectOnce(url, token) {
    return new Promise((resolve, reject) => {
      const ws = new this.WebSocketClass(url, { headers: this.wsHeaders(url), handshakeTimeout: 10000 });
      this.ws = ws;
      let ping = null;
      let stale = null;
      let cleaned = false;
      let openedAtMs=0,closeOutcome=null;
      const current = () => !cleaned && this.ws===ws && !this.stopped;
      const usable = () => current() && this.connected && ws.readyState===WebSocket.OPEN
        && !this.recoveryReconnectPending;
      const activity = () => {
        if(!usable())return false;
        this.lastMessageMs=Date.now();
        this.onStatus(true,this.lastMessageMs);
        return true;
      };
      const clean = (code=null) => {
        if (cleaned) return;
        cleaned = true;
        if (ping) clearInterval(ping);
        if (stale) clearInterval(stale);
        // Old socket callbacks may arrive after its replacement opened. They
        // must never invalidate the replacement's books, health or ownership.
        if(this.ws!==ws)return;
        const cause=this.connectionDiagnostics.lastEvent;
        closeOutcome={cause:cause?.type||null,connectedForMs:openedAtMs?Math.max(0,Date.now()-openedAtMs):0};
        this.invalidateWsBooks('websocket_disconnect');
        this.wsSubscriptionCommands.clear();this.wsSubscriptions.clear();
        this.wsInitialMarketSubscriptions.clear();this.wsMarketMembership.clear();
        this.wsMembershipCommands.clear();this.wsMembershipRetry.clear();
        this.ws = null;
        this.connected = false;
        this.connectionDiagnostics.disconnects++;
        this.noteConnectionEvent('disconnected',{closeCode:Number.isInteger(code)?code:null,
          cause: ['recovery_reconnect','transport_error','subscription_refresh','stopped','stale_connection'].includes(cause?.type)
            ?cause.type:null,reason:cause?.reason||null});
        this.onStatus(false, this.lastMessageMs);
      };
      ws.on('open', () => {
        if(!current()){try{ws.close();}catch{}return;}
        openedAtMs=Date.now();
        this.connectionEpoch++;
        this.quoteStreamSequences?.clear();
        this.recoveryReconnectPending=false;
        this.wsSubscriptionCommands.clear();this.wsSubscriptions.clear();
        this.wsInitialMarketSubscriptions.clear();this.wsMarketMembership.clear();
        this.wsMembershipCommands.clear();this.wsMembershipRetry.clear();
        this.connected = true;
        this.connectionDiagnostics.connections++;
        this.noteConnectionEvent('connected');
        this.lastMessageMs = Date.now();
        this.onStatus(true, this.lastMessageMs);
        const subscribe=params=>{
          const id=this.nextWsCommandId();
          this.wsSubscriptionCommands.set(id,new Set(params.channels));
          if(params.market_tickers?.length)
            this.wsInitialMarketSubscriptions.set(id,{channels:new Set(params.channels),
              tickers:new Set(params.market_tickers),atMs:Date.now(),epoch:this.connectionEpoch});
          ws.send(JSON.stringify({id,cmd:'subscribe',params}));
        };
        try {
          const tickers = [...this.wanted];
          if (tickers.length) {
            subscribe({channels:['ticker','trade'],market_tickers:tickers});
            // Preserve native YES-bid / NO-bid pricing and every Multiply rule.
            subscribe({channels:['orderbook_delta'],market_tickers:tickers,use_yes_price:false});
          }
          subscribe({channels:['market_lifecycle_v2']});
          // Q-17: public market channels only; private account/order streams removed.
        } catch(error) {
          this.noteConnectionEvent('transport_error',{reason:'subscription_send_failed'});
          this.connectionDiagnostics.transportErrors++;
          clean();reject(error);try{ws.terminate();}catch{}return;
        }
        ping = setInterval(() => {
          if(!usable())return;
          try{ws.ping();}catch{this.forceRecoveryReconnect('ping_send_failed');}
        }, 20000);
        stale = setInterval(() => {
          if(!current())return;
          this.maintainRecovery(Date.now());
          this.maintainMarketMembership(Date.now());
          if (Date.now() - this.lastMessageMs > 65000 && ws.readyState === WebSocket.OPEN) {
            this.noteConnectionEvent('stale_connection',{reason:'heartbeat_timeout'});
            this.connected=false;this.onStatus(false,this.lastMessageMs);ws.terminate();
          }
          if (token !== this.reconnectToken && ws.readyState === WebSocket.OPEN) {
            this.noteConnectionEvent('subscription_refresh');
            this.connected=false;this.onStatus(false,this.lastMessageMs);ws.close(1000, 'refresh');
          }
        }, 5000);
      });
      ws.on('message', (raw) => {
        if(!usable())return;
        let data;
        try{data=JSON.parse(raw.toString());if(!data||typeof data!=='object'||typeof data.type!=='string')throw Error('invalid_frame');}
        catch{this.connectionDiagnostics.malformedMessages++;this.forceRecoveryReconnect('invalid_websocket_message');return;}
        activity();
        try{this.handle(data);}catch{
          this.connectionDiagnostics.malformedMessages++;
          this.forceRecoveryReconnect('websocket_handler_failed');
        }
      });
      // ws answers server Ping automatically; observing it must not manufacture
      // quote/book freshness. A heartbeat proves transport liveness only.
      ws.on('ping', activity);
      ws.on('pong', activity);
      ws.on('error', (e) => {
        if(this.ws===ws&&!cleaned){
          this.connectionDiagnostics.transportErrors++;
          const code=typeof e?.code==='string'&&/^[A-Z0-9_]{1,40}$/.test(e.code)?e.code:'websocket_error';
          this.noteConnectionEvent('transport_error',{reason:code});
        }
        clean();reject(e);try{ws.terminate();}catch{}
      });
      ws.on('close', (code) => { clean(code); resolve(closeOutcome); });
    });
  }

  handle(data) {
    const type = data.type;
    const msg = data.msg || {};

    if(type==='subscribed'){
      const request=this.wsSubscriptionCommands.get(finiteInt(data.id));
      const sid=finiteInt(msg.sid);
      if(request?.has(msg.channel) && sid!=null){
        this.wsSubscriptions.set(msg.channel,sid);
        request.delete(msg.channel);
        if(request.size===0)this.wsSubscriptionCommands.delete(finiteInt(data.id));
        const initial=this.wsInitialMarketSubscriptions.get(finiteInt(data.id));
        if(initial?.channels?.has(msg.channel)){
          this.wsMarketMembership.set(msg.channel,new Set(initial.tickers));
          initial.channels.delete(msg.channel);
          if(initial.channels.size===0)this.wsInitialMarketSubscriptions.delete(finiteInt(data.id));
          this.queueMarketMembershipFlush();
        }
      }
      return;
    }
    if(type==='unsubscribed'){
      const sid=sidOf(data,msg);
      if(sid!=null && [...this.wsSubscriptions.values()].includes(sid))
        this.forceRecoveryReconnect('required_subscription_lost');
      return;
    }

    // A rejected/invalid get_snapshot command must release its in-flight
    // tickers. Otherwise they can remain permanently pending while every later
    // delta is buffered and eventually dropped. Retry/cool down that market;
    // a rejected book alone must not tear down account/private subscriptions.
    if(type==='error'){
      const requestId=finiteInt(data?.id);
      const command=requestId==null?null:this.recoverySnapshotCommands.get(requestId);
      if(requestId!=null&&this.wsMembershipCommands.has(requestId)){
        this.wsMembershipCommands.delete(requestId);
        this.membershipStats.errors++;
        this.forceRecoveryReconnect('membership_update_error');return;
      }
      if(command){
        this.bookIntegrityStats.recoverySnapshotErrors+=1;
        // Unknown/lost subscription, missing authorization, internal channel
        // failure and subscription overflow are NOT market-local bad data.
        // Preserve fail-closed shared recovery for these documented conditions.
        const code=finiteInt(msg?.code);
        if([7,9,10,17,25].includes(code)){
          this.connectionDiagnostics.subscriptionErrors++;
          this.forceRecoveryReconnect(`subscription_error:${code}`);return;
        }
        const state=this.streamState(command.sid);
        const tickers=[...command.tickers];
        for(const ticker of tickers){
          this.releaseRecoverySnapshotTicker(state,ticker);
          const code=finiteInt(msg?.code),reason=`orderbook_recovery_error:${code??'unknown'}`;
          this.noteRecoveryFailure(state,ticker,reason);
          if(state&&this.tickerRecoveryState(ticker).attempts>=RECOVERY_SNAPSHOT_MAX_ATTEMPTS)
            this.coolDownTicker(state,ticker,reason);
          else void this.resyncBook(ticker);
        }
        if(state?.pendingSnapshots?.size)this.requestStreamSnapshots(state);
      } else if(this.wsSubscriptionCommands.has(requestId) || [9,10,17,25].includes(Number(msg.code))) {
        // A rejected or terminated required subscription is not a healthy feed.
        // Recover through the existing reconnect loop; never bypass LIVE health.
        this.connectionDiagnostics.subscriptionErrors++;
        const code=Number.isSafeInteger(Number(msg.code))?Number(msg.code):'unknown';
        this.forceRecoveryReconnect(`subscription_error:${code}`);
      }
      return;
    }

    // Kalshi update_subscription acknowledgements can carry the same SID/SEQ
    // cursor as book messages. They advance continuity but never heal a book.
    if (type === 'ok') {
      const sid=sidOf(data,msg),seq=seqOf(data,msg);
      const state=this.streamState(sid);
      if (state && seq!=null) this.advanceStreamSequence(data,{type:'ok'});
      this.acknowledgeMarketMembership(data);
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
      this.publishQuote(q,{source:'WS_TICKER',stream:`${this.connectionEpoch}:${sidOf(data,msg)??'ticker'}`,sequence:(data.seq??msg.seq)!=null?seqOf(data,msg):null,emit:true});
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
        this.publishQuote(q,{source:'LIFECYCLE',emit:true});
      }
      return;
    }
    if (['fill', 'market_position', 'market_positions', 'user_order', 'user_orders'].includes(type)) this.onPrivate({ type, msg });
  }
}
