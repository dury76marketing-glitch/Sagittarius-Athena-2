import {OPS_LIMITS,RequestLane,validateBalance,validateRestingOrders,finiteNumber} from './operationalSafety.mjs';
import {performance} from 'node:perf_hooks';
import { createPrivateKey, constants, randomUUID, sign as cryptoSign } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { isMatchDecisionMarket } from './doctrine.mjs';

const fp = (v) => Number.parseFloat(String(v ?? 0)) || 0;
const dollarCents = (v) => Math.round(fp(v) * 100);
const dollarCentsExact = (v) => fp(v) * 100;
const legacyCents = (v) => Math.round(fp(v));
const marketCents = (dollars, legacy) => dollars != null ? dollarCents(dollars) : legacyCents(legacy);
const millis = (v) => v ? Date.parse(v) : 0;
const finiteExchangeIndex = (v) => v != null && String(v).trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.trunc(Number(v)) : null;

export function exchangeBalanceCents(balance = {}, exchangeIndex = 0) {
  const idx = finiteExchangeIndex(exchangeIndex);
  if (idx == null) return null;
  const rows = Array.isArray(balance?.balance_breakdown) ? balance.balance_breakdown : [];
  const row = rows.find((x) => finiteExchangeIndex(x?.exchange_index) === idx);
  if (row && Number.isFinite(Number(row.balance))) return dollarCentsExact(row.balance);
  if (idx === 0 && Number.isFinite(Number(balance?.balance))) return Number(balance.balance);
  return rows.length ? 0 : null;
}

const brokerDecimal = value => ((typeof value==='number'&&Number.isFinite(value))
  ||(typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value)))
  &&Number.isFinite(Number(value))&&Number(value)>=0;
const BROKER_TERMINAL = new Set(['executed','filled','canceled','cancelled','rejected','expired']);
const BROKER_ACTIVE = new Set(['resting','pending','open']);

// Receipt quantities must not use parseFloat's silent invalid-to-zero fallback.
// Both the fixed-point GET shape and the documented V2 POST shape are accepted.
// V2 POST legitimately omits status/ticker: do not impose GET-only fields there.
function brokerReceiptError(raw,{clientOrderId=null,requireCounts=true}={}){
  const d=raw?.order||raw;
  if(!d||typeof d!=='object'||Array.isArray(d))return 'broker_order_shape_invalid';
  if(typeof d.order_id!=='string'||!d.order_id.trim())return 'broker_order_id_missing';
  if(clientOrderId&&d.client_order_id!=null&&String(d.client_order_id)!==String(clientOrderId))
    return 'broker_order_client_id_mismatch';
  const decimal=brokerDecimal;
  for(const [name,value] of [['fill_count',d.fill_count_fp??d.fill_count],['remaining_count',d.remaining_count_fp??d.remaining_count]]){
    if((value==null&&requireCounts)||(value!=null&&!decimal(value)))return `broker_${name}_invalid`;
  }
  for(const name of ['average_fee_paid','maker_fees_dollars','taker_fees_dollars']){
    if(d[name]!=null&&!decimal(d[name]))return 'broker_fee_invalid';
  }
  for(const name of ['average_fill_price','yes_price_dollars']){
    if(d[name]!=null&&(!decimal(d[name])||Number(d[name])>1))return 'broker_fill_price_invalid';
  }
  const initial=d.initial_count_fp??d.initial_count;
  if(initial!=null&&(!decimal(initial)||Number(d.fill_count_fp??d.fill_count)>Number(initial)+1e-7
    ||Number(d.remaining_count_fp??d.remaining_count)>Number(initial)+1e-7
    ||Number(d.fill_count_fp??d.fill_count)+Number(d.remaining_count_fp??d.remaining_count)>Number(initial)+1e-7))return 'broker_initial_quantity_inconsistent';
  return null;
}

function brokerErrorFields(raw = {}) {
  const root = raw?.error && typeof raw.error === 'object' ? raw.error : raw;
  const code = root?.code ?? raw?.code ?? null;
  const message = root?.message ?? root?.msg ?? raw?.message ?? (typeof raw?.error === 'string' ? raw.error : null);
  const details = root?.details ?? raw?.details ?? null;
  const text = [code, message, typeof details === 'string' ? details : details == null ? null : JSON.stringify(details)].filter((x) => x != null && String(x).length).join(': ');
  return {
    brokerErrorCode: code == null ? null : String(code),
    brokerErrorMessage: message == null ? null : String(message),
    brokerErrorDetails: details == null ? null : details,
    brokerError: text || null,
  };
}

export function extractEventTickerFromMarket(ticker = '') {
  const t = String(ticker);
  const strike = t.match(/^(.+)-T[\d.]+$/);
  if (strike) return strike[1];
  const i = t.lastIndexOf('-');
  if (i > 0) {
    const suffix = t.slice(i + 1);
    if (suffix.length <= 4 && /^[A-Z]+$/.test(suffix)) return t.slice(0, i);
  }
  return t;
}

export function parseMarket(m = {}) {
  const q = {
    ticker: m.ticker || m.market_ticker || '',
    title: m.title || m.market_title || m.yes_sub_title || m.ticker || '',
    eventTicker: m.event_ticker || extractEventTickerFromMarket(m.ticker || ''),
    seriesTicker: m.series_ticker || '',
    category: m.category || '',
    status: m.status || '',
    exchangeIndex: Number.isFinite(Number(m.exchange_index)) ? Number(m.exchange_index) : null,
    yesBid: marketCents(m.yes_bid_dollars, m.yes_bid),
    yesAsk: marketCents(m.yes_ask_dollars, m.yes_ask),
    yesBidSize: fp(m.yes_bid_size_fp ?? m.yes_bid_size),
    yesAskSize: fp(m.yes_ask_size_fp ?? m.yes_ask_size),
    prevYesBid: marketCents(m.previous_yes_bid_dollars, m.previous_yes_bid),
    prevYesAsk: marketCents(m.previous_yes_ask_dollars, m.previous_yes_ask),
    lastPrice: marketCents(m.last_price_dollars ?? m.price_dollars, m.last_price ?? m.price),
    volume: fp(m.volume_fp ?? m.volume),
    volume24h: fp(m.volume_24h_fp ?? m.volume_24h),
    result: m.result || '',
    closeTimeMs: millis(m.close_time ?? m.expiration_time),
    occurrenceTimeMs: millis(m.occurrence_datetime),
    expectedExpirationMs: millis(m.expected_expiration_time),
    canCloseEarly: Boolean(m.can_close_early ?? true),
    recentTrades: 0,
    recentTradesObservedAtMs: 0,
    updatedAtMs: Number(m.ts_ms) || (m.updated_time ? millis(m.updated_time) : Date.now()),
  };
  if (!q.yesAsk && q.yesBid && q.yesBid < 100 && !q.result) q.yesAsk = q.yesBid + 1;
  return q;
}

export function signedPath(baseUrl, apiPath) {
  const u = new URL(apiPath.startsWith('http') ? apiPath : `${baseUrl.replace(/\/$/, '')}/${apiPath.replace(/^\//, '')}`);
  return u.pathname;
}

export function signKalshi(privateKeyPem, timestamp, method, path) {
  const key = createPrivateKey(privateKeyPem);
  const message = Buffer.from(timestamp + method.toUpperCase() + path.split('?')[0]);
  if (key.asymmetricKeyType === 'ed25519') return cryptoSign(null, message, key).toString('base64');
  if (key.asymmetricKeyType === 'rsa') {
    return cryptoSign('sha256', message, { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }).toString('base64');
  }
  throw new Error('unsupported_kalshi_key_type');
}

export class KalshiClient {
  constructor(credentials, baseUrl, fallbackBaseUrl) {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
    this.fallbackBaseUrl = fallbackBaseUrl;
    // LIVE exchange-shard funding is account plumbing, not trading doctrine.
    // Keep a short-lived in-process record of accepted asynchronous transfers
    // so repeated quote evaluations cannot fire duplicate funding mutations
    // while Kalshi is still moving collateral between exchange indexes.
    this.exchangeFundingInFlight = new Map();
    this.readLane=new RequestLane(OPS_LIMITS.readConcurrency,OPS_LIMITS.readPending);
    this.mutationLane=new RequestLane(OPS_LIMITS.mutationConcurrency,OPS_LIMITS.mutationPending);
  }

  setCredentials(c) { this.credentials = c; }
  getCredentials() { return this.credentials; }
  hasCredentials() { return Boolean(this.credentials?.keyId && this.credentials?.privateKeyPem); }

  headers(method, baseUrl, apiPath) {
    if (!this.hasCredentials()) throw new Error('Kalshi credentials are not configured');
    const timestamp = Date.now().toString();
    const path = signedPath(baseUrl, apiPath);
    return {
      'KALSHI-ACCESS-KEY': this.credentials.keyId,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
      'KALSHI-ACCESS-SIGNATURE': signKalshi(this.credentials.privateKeyPem, timestamp, method, path),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async fetchOnce(method, baseUrl, apiPath, body, timeoutMs, authenticated = true) {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/${apiPath.replace(/^\//, '')}`, {
        method,
        headers: authenticated ? this.headers(method, baseUrl, apiPath) : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body == null ? undefined : JSON.stringify(body),
        signal: c.signal,
      });
      // A failed/oversized response never becomes partial broker truth.
      let text;
      if(res.body?.getReader){
        const reader=res.body.getReader(),chunks=[];let size=0;
        try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
          if(size>OPS_LIMITS.responseBytes)throw new Error('broker_response_size_limit');chunks.push(Buffer.from(part.value));}
          text=Buffer.concat(chunks,size).toString('utf8');
        }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
      }else{text=await res.text();if(Buffer.byteLength(text)>OPS_LIMITS.responseBytes)throw new Error('broker_response_size_limit');}
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      return { ok: res.ok, status: res.status, data, headers: res.headers };
    } finally {
      clearTimeout(timer);
    }
  }

  async request(method,apiPath,body=null,options={}){
    const mutation=method.toUpperCase()!=='GET'||options.mutation===true;
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    const lane=mutation?this.mutationLane:this.readLane;
    let started=false;
    try{return await lane.run(()=>{started=true;return this.requestWithBudget(method,apiPath,body,{...options,mutation,deadline});},deadline);}
    catch(error){return{ok:false,status:0,...(!started?{notSubmitted:true}:{}),data:{error:String(error?.message||'broker_request_failed')}};}
    finally{if(mutation)this.onAccountMutation?.();}
  }
  resourceSnapshot(){return{reads:this.readLane.snapshot(),mutations:this.mutationLane.snapshot(),responseByteLimit:OPS_LIMITS.responseBytes};}

  async requestWithBudget(method, apiPath, body = null, {
    mutation = method.toUpperCase() !== 'GET',
    timeoutMs = mutation ? 12000 : 8000,
    maxAttempts = mutation ? 1 : 6,
    authenticated = true,
    preferFallbackHost = false,
    // HC2-R1: lane admission is not execution authorization. A queued entry
    // must revalidate its durable intent, then its live signal/control state.
    beforeDispatch = null,
    confirmDispatch = null,
    deadline=performance.now()+OPS_LIMITS.requestBudgetMs,
  } = {}) {
    mutation=mutation||method.toUpperCase()!=='GET';
    const primaryHosts = [this.baseUrl, this.fallbackBaseUrl].filter((x, i, a) => x && a.indexOf(x) === i);
    const hosts = preferFallbackHost && primaryHosts.length > 1 ? [primaryHosts[1], primaryHosts[0]] : primaryHosts;
    let last = null;
    const max = mutation?1:Math.max(1,Math.min(6,Math.floor(Number(maxAttempts)||6)));
    for (let attempt = 0; attempt < max; attempt += 1) {
      const host = hosts[Math.min(attempt, hosts.length - 1)] || this.baseUrl;
      try {
        if(mutation){
          const rejectDispatch=reason=>({ok:false,status:0,notSubmitted:true,data:{error:String(reason||'dispatch_authorization_rejected').slice(0,160)}});
          if(performance.now()>=deadline)return rejectDispatch('broker_request_deadline_exceeded');
          if(typeof beforeDispatch==='function'){
            let decision;
            try{decision=await beforeDispatch();}
            catch{return rejectDispatch('dispatch_authorization_unverified');}
            if(decision?.ok!==true)return rejectDispatch(decision?.reason);
          }
          if(typeof confirmDispatch==='function'){
            let decision;
            try{decision=confirmDispatch();}
            catch{return rejectDispatch('dispatch_authorization_unverified');}
            // Deliberately synchronous: no await between this final signal
            // check, account invalidation, signing and the network send.
            if(decision?.ok!==true)return rejectDispatch(decision?.reason);
          }
        }
        const remaining=deadline-performance.now();
        if(remaining<=0)return{ok:false,status:0,...(mutation?{notSubmitted:true}:{}),data:{error:'broker_request_deadline_exceeded'}};
        if(mutation)this.onAccountMutation?.();
        const r = await this.fetchOnce(method, host, apiPath, body, Math.min(timeoutMs,remaining), authenticated);
        last = r;
        if (r.ok) return r;
        if (mutation) return r;
        const rateLimited = String(r.data?.error || r.data?.message || '').toLowerCase().includes('rate limit');
        if (![429, 502, 503, 504].includes(r.status) && !rateLimited) return r;
        if (attempt + 1 >= max) break;
        const retryValue=r.headers?.get?.('retry-after');
        const retryAfter=retryValue==null?0:finiteNumber(retryValue)?Math.max(0,Number(retryValue)*1000):Math.max(0,Date.parse(retryValue)-Date.now())||0;
        const delay=retryAfter||Math.min(250*2**attempt,3000)+Math.floor(Math.random()*100);
        // Honour Retry-After; a delay beyond our request budget returns the
        // failed response, rather than hanging or retrying before permitted.
        if(delay>=deadline-performance.now())return r;
        await sleep(delay);
      } catch (e) {
        last = { ok: false, status: 0, data: { error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) } };
        if (mutation || attempt + 1 >= max) break;
        const delay=Math.min(250*2**attempt,3000)+Math.floor(Math.random()*100);
        if(delay>=deadline-performance.now())break;
        await sleep(delay);
      }
    }
    return last || { ok: false, status: 0, data: { error: 'request_failed' } };
  }

  async testConnection() {
    const [b, l] = await Promise.all([
      this.request('GET', '/portfolio/balance'),
      this.request('GET', '/account/limits'),
    ]);
    if (!b.ok) throw new Error(`Kalshi authentication failed (${b.status}): ${JSON.stringify(b.data)}`);
    return { balance: validateBalance(b.data), limits: l.ok ? l.data : null };
  }

  async getBalance() {
    const r = await this.request('GET', '/portfolio/balance');
    if (!r.ok) throw new Error(`balance ${r.status}`);
    return validateBalance(r.data);
  }

  async getPositions() {
    const rows=await this.completePortfolioPages({path:'/portfolio/positions?limit=1000&count_filter=position',field:'market_positions',label:'positions'});
    const seenPositions=new Set();
    for(const p of rows){
      const ticker=p?.ticker??p?.market_ticker;
      const rawQuantity=p?.position_fp??p?.position??p?.market_position;
      if(typeof ticker!=='string'||!ticker.trim()||rawQuantity==null
        ||!finiteNumber(rawQuantity)||seenPositions.has(ticker))throw new Error('positions_malformed_position_record');
      seenPositions.add(ticker);
    }
    return rows;
  }

  async getOpenOrders() {
    return validateRestingOrders(await this.completePortfolioPages({path:'/portfolio/orders?status=resting&limit=1000',field:'orders',label:'resting_orders'}));
  }

  // HC1: an incomplete account response is never authoritative broker truth.
  // In particular, repeated cursors previously looped without bound and a
  // missing market_positions array silently looked like an empty account.
  async completePortfolioPages({path,field,label,maxPages=100}={}) {
    const rows=[];
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    const seen=new Set();
    let cursor='';
    for(let page=0;page<maxPages;page++){
      if(performance.now()>=deadline)throw new Error(`${label}_collection_deadline`);
      const r=await this.request('GET',`${path}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);
      if(!r?.ok)throw new Error(`${label}_request_failed_${r?.status??'unknown'}`);
      if(!Array.isArray(r.data?.[field]))throw new Error(`${label}_malformed_page`);
      if(r.data[field].length>1000)throw new Error(`${label}_oversized_page`);
      rows.push(...r.data[field]);
      const next=r.data.cursor;
      if(next!=null&&typeof next!=='string')throw new Error(`${label}_invalid_cursor`);
      if(!next)return rows;
      if(seen.has(next))throw new Error(`${label}_repeated_cursor`);
      seen.add(next);cursor=next;
    }
    throw new Error(`${label}_page_limit_exceeded`);
  }

  async getOpenMarkets(maxPages = 6, maxMarkets = 3000) {
    const out = [];
    let cursor = '';
    for (let p = 0; p < maxPages && out.length < maxMarkets; p += 1) {
      const r = await this.request('GET', `/markets?status=open&limit=500&mve_filter=exclude${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (!r.ok) break;
      for (const m of r.data.markets || []) out.push(parseMarket(m));
      cursor = r.data.cursor || '';
      if (!cursor) break;
    }
    return out.slice(0, maxMarkets);
  }

  async getRecentTrades(minutes = 5, pages = 5) {
    const minTs = Math.floor((Date.now() - minutes * 60000) / 1000);
    const map = new Map();
    let cursor = '';
    for (let p = 0; p < pages; p += 1) {
      const r = await this.request('GET', `/markets/trades?min_ts=${minTs}&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (!r.ok) break;
      for (const t of r.data.trades || []) {
        const ticker = t.ticker || t.market_ticker;
        if (!ticker) continue;
        const old = map.get(ticker);
        const price = marketCents(t.yes_price_dollars ?? t.price_dollars, t.yes_price ?? t.price);
        const ts = Number(t.ts_ms) || (t.created_time ? Date.parse(t.created_time) : Date.now());
        if (!old) map.set(ticker, { count: 1, lastPriceCents: price, latestMs: ts });
        else {
          old.count += 1;
          if (ts > old.latestMs) { old.latestMs = ts; old.lastPriceCents = price; }
        }
      }
      cursor = r.data.cursor || '';
      if (!cursor) break;
    }
    const observedAtMs = Date.now();
    for (const v of map.values()) v.observedAtMs = observedAtMs;
    return map;
  }

  // Exact-ticker recent activity probe used only by the pre-execution GCA1
  // fallback. Unlike the broad scanner snapshot, this query is force-fresh,
  // public, bounded, and can safely overwrite an old trade count with zero.
  async getRecentTradesForTicker(ticker, minutes = 5) {
    const marketTicker = String(ticker || '');
    if (!marketTicker) return { count: 0, lastPriceCents: 0, latestMs: 0, observedAtMs: Date.now() };
    const minTs = Math.floor((Date.now() - Math.max(1, Number(minutes) || 5) * 60000) / 1000);
    const r = await this.request(
      'GET',
      `/markets/trades?ticker=${encodeURIComponent(marketTicker)}&min_ts=${minTs}&limit=1000`,
      null,
      { timeoutMs: 1500, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
    );
    if (!r.ok) throw new Error(`recent_trades ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
    let count = 0;
    let latestMs = 0;
    let lastPriceCents = 0;
    for (const t of Array.isArray(r.data?.trades) ? r.data.trades : []) {
      const tkr = String(t.ticker || t.market_ticker || '');
      if (tkr !== marketTicker) continue;
      count += 1;
      const ts = Number(t.ts_ms) || (t.created_time ? Date.parse(t.created_time) : 0);
      if (ts >= latestMs) {
        latestMs = ts;
        lastPriceCents = marketCents(t.yes_price_dollars ?? t.price_dollars, t.yes_price ?? t.price);
      }
    }
    return { count, lastPriceCents, latestMs, observedAtMs: Date.now() };
  }

  async getEvent(eventTicker) {
    const r = await this.request('GET', `/events/${encodeURIComponent(eventTicker)}?with_nested_markets=true`);
    return r.ok ? (r.data.event || r.data) : null;
  }

  // Optional game-clock authority enrichment. These endpoints are deliberately
  // bounded to a small number of attempts so an unavailable enrichment API can
  // never stall the main scanner. Callers fail closed if the evidence is not
  // available.
  async getMilestonesForEvent(eventTicker, limit = 500) {
    const event = String(eventTicker || '');
    if (!event) return [];
    const cap = Math.max(1, Math.min(500, Math.floor(Number(limit) || 500)));
    const out = [];
    let cursor = '';
    // Exact-event milestone queries should be tiny. Paginate instead of silently
    // truncating, but fail closed if the provider returns an implausibly large
    // result set rather than spending unbounded scanner time.
    for (let page = 0; page < 5; page += 1) {
      const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const r = await this.request(
        'GET',
        `/milestones?limit=${cap}&related_event_ticker=${encodeURIComponent(event)}${suffix}`,
        null,
        { timeoutMs: 1800, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
      );
      if (!r.ok) throw new Error(`milestones ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
      out.push(...(Array.isArray(r.data?.milestones) ? r.data.milestones : []));
      cursor = String(r.data?.cursor || '');
      if (!cursor) return out;
    }
    throw new Error('milestones pagination_exceeded');
  }


  // HF6/GCA2-P1 bulk series milestone discovery. A scanner batch can contain
  // dozens of events from the same sports series. Fetching the identical
  // `events?with_milestones=true` pages once per event caused a provider request
  // storm and 429s. This primitive returns the bounded deduplicated series set;
  // GameClockAuthority performs the exact-event membership selection locally.
  async getMilestonesForSeries(seriesTicker = '', limit = 200) {
    const series = String(seriesTicker || '');
    if (!series) return [];
    const cap = Math.max(1, Math.min(200, Math.floor(Number(limit) || 200)));
    const milestones = new Map();
    let cursor = '';
    for (let page = 0; page < 5; page += 1) {
      const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const r = await this.request(
        'GET',
        `/events?limit=${cap}&series_ticker=${encodeURIComponent(series)}&with_milestones=true&status=open${suffix}`,
        null,
        { timeoutMs: 1800, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
      );
      if (!r.ok) throw new Error(`events_with_milestones ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
      for (const m of Array.isArray(r.data?.milestones) ? r.data.milestones : []) {
        if (m?.id) milestones.set(String(m.id), m);
      }
      cursor = String(r.data?.cursor || '');
      if (!cursor) return [...milestones.values()];
    }
    throw new Error('events_with_milestones pagination_exceeded');
  }

  // R28/GCA2 exact-event compatibility wrapper. The bulk series fetch above is
  // intentionally reusable, while this method preserves the original contract
  // for callers/tests that request one event explicitly.
  async getMilestonesForSeriesEvent(eventTicker, seriesTicker = '', limit = 200) {
    const event = String(eventTicker || '');
    if (!event) return [];
    let series = String(seriesTicker || '');
    if (!series) {
      const exact = await this.request(
        'GET',
        `/events/${encodeURIComponent(event)}`,
        null,
        { timeoutMs: 1800, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
      );
      if (!exact.ok) throw new Error(`event_lookup ${exact.status}: ${String(exact.data?.error || exact.data?.message || 'request_failed')}`);
      series = String(exact.data?.event?.series_ticker || exact.data?.series_ticker || '');
    }
    if (!series) return [];
    const rows = await this.getMilestonesForSeries(series, limit);
    return rows.filter((m) => {
      const primary = Array.isArray(m?.primary_event_tickers) ? m.primary_event_tickers.map(String) : [];
      const related = Array.isArray(m?.related_event_tickers) ? m.related_event_tickers.map(String) : [];
      return primary.includes(event) || related.includes(event);
    });
  }

  async getLiveData(milestoneId) {
    const id = String(milestoneId || '');
    if (!id) return null;
    const r = await this.request(
      'GET',
      `/live_data/milestone/${encodeURIComponent(id)}`,
      null,
      { timeoutMs: 1500, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
    );
    if (!r.ok) throw new Error(`live_data ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
    return r.data?.live_data || r.data || null;
  }

  async getGameStats(milestoneId) {
    const id = String(milestoneId || '');
    if (!id) return null;
    const r = await this.request(
      'GET',
      `/live_data/milestone/${encodeURIComponent(id)}/game_stats`,
      null,
      { timeoutMs: 1500, maxAttempts: 2, authenticated: false, preferFallbackHost: true },
    );
    if (!r.ok) throw new Error(`game_stats ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
    return r.data || null;
  }

  async getLiveSportsViaTrades(tradeData) {
    const active = [...tradeData.entries()]
      .filter(([, v]) => v.count >= 5)
      .map(([t]) => t)
      .filter((t) => {
        const u = t.toUpperCase();
        return (u.includes('MATCH') || u.includes('GAME'))
          && !['SPREAD','TOTAL','HRDERBY','3PT','DERBY','EXACT','GAMETO','ANYSET','-1H','-2H','-1Q','-2Q','-3Q','-4Q','-1P','-2P','-3P','HTOTAL','QTOTAL'].some((x) => u.includes(x));
      });
    const activeSet = new Set(active);
    const events = [...new Set(active.map(extractEventTickerFromMarket))];
    const out = [];
    for (let i = 0; i < events.length; i += 10) {
      const rows = await Promise.all(events.slice(i, i + 10).map((e) => this.getEvent(e).catch(() => null)));
      for (const event of rows) {
        if (!event) continue;
        const cat = String(event.category || '').toLowerCase();
        if (cat === 'politics' || cat === 'elections') continue;
        for (const raw of event.markets || []) {
          if (!activeSet.has(raw.ticker) || raw.mve_collection_ticker) continue;
          const q = parseMarket({ ...raw, event_ticker: event.event_ticker || raw.event_ticker, series_ticker: event.series_ticker || raw.series_ticker, category: cat || 'sports' });
          if (!q.canCloseEarly || q.closeTimeMs <= Date.now() || !isMatchDecisionMarket(q)) continue;
          q.recentTrades = tradeData.get(q.ticker)?.count || 0;
          q.recentTradesObservedAtMs = Number(tradeData.get(q.ticker)?.observedAtMs || 0);
          out.push(q);
        }
      }
    }
    return out;
  }

  async getMarket(ticker) {
    const r = await this.request('GET', `/markets/${encodeURIComponent(ticker)}`);
    return r.ok ? parseMarket(r.data.market || r.data) : null;
  }

  async getOrderbook(ticker) {
    const r = await this.request('GET', `/markets/${encodeURIComponent(ticker)}/orderbook`);
    if (!r.ok) return null;
    const ob = r.data.orderbook_fp || r.data.orderbook || {};
    const yesBids = (ob.yes_dollars || ob.yes || [])
      .map((x) => ({ priceCents: ob.yes_dollars ? dollarCents(x[0]) : legacyCents(x[0]), count: fp(x[1]) }))
      .filter((x) => x.priceCents > 0 && x.priceCents < 100 && x.count > 0)
      .sort((a, b) => b.priceCents - a.priceCents);
    const noBids = (ob.no_dollars || ob.no || [])
      .map((x) => ({ priceCents: ob.no_dollars ? dollarCents(x[0]) : legacyCents(x[0]), count: fp(x[1]) }))
      .filter((x) => x.priceCents > 0 && x.priceCents < 100 && x.count > 0)
      .sort((a, b) => b.priceCents - a.priceCents);
    return { ticker, yesBids, noBids, updatedAtMs: Date.now() };
  }

  clientOrderPrefix(ownerId, tradeId, phase) {
    const o = String(ownerId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18);
    const t = String(tradeId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
    const p = String(phase).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18);
    return `sag-${o}-${t}-${p}-`;
  }

  buildClientOrderId(ownerId, tradeId, phase) {
    return `${this.clientOrderPrefix(ownerId, tradeId, phase)}${randomUUID().slice(0, 8)}`;
  }

  buildOrder({ ticker, action, count, priceCents, clientOrderId, exchangeIndex = -1, timeInForce = 'immediate_or_cancel' }) {
    const tif=String(timeInForce||'immediate_or_cancel');
    if(!['immediate_or_cancel','fill_or_kill','good_till_canceled'].includes(tif))throw new Error(`invalid timeInForce: ${tif}`);
    // Never convert a bad action into SELL or clamp a planned order into a
    // different economic instruction. Valid fractional exits remain supported.
    const fixed=(value,scale)=>brokerDecimal(value)&&Math.abs(Number(value)*scale-Math.round(Number(value)*scale))<=1e-7;
    if(typeof ticker!=='string'||!ticker.trim()||ticker!==ticker.trim())throw new Error('invalid_order_ticker');
    if(typeof clientOrderId!=='string'||!clientOrderId.trim()||clientOrderId!==clientOrderId.trim())throw new Error('invalid_order_client_id');
    if(!['buy','sell'].includes(action))throw new Error('invalid_order_action');
    if(!fixed(count,100)||!(Number(count)>0)||!Number.isSafeInteger(Math.round(Number(count)*100)))throw new Error('invalid_order_quantity');
    if(!fixed(priceCents,100)||!(Number(priceCents)>=1&&Number(priceCents)<=99))throw new Error('invalid_order_price');
    return {
      ticker,
      client_order_id: clientOrderId,
      side: action === 'buy' ? 'bid' : 'ask',
      count: Number(count).toFixed(2),
      price: (Number(priceCents) / 100).toFixed(4),
      time_in_force: tif,
      self_trade_prevention_type: 'taker_at_cross',
      post_only: false,
      cancel_order_on_pause: false,
      reduce_only: action === 'sell',
      subaccount: 0,
      // Prefer the authoritative market exchange_index when known. -1 remains
      // a safe compatibility fallback because Kalshi auto-routes by ticker.
      exchange_index: finiteExchangeIndex(exchangeIndex) ?? -1,
    };
  }

  resultFrom(raw, clientOrderId, ambiguous = false) {
    const d = raw?.order || raw || {};
    const fillCount = fp(d.fill_count_fp ?? d.fill_count);
    const averageFeePaidCents = d.average_fee_paid != null ? dollarCentsExact(d.average_fee_paid) : null;
    // GET summaries report cumulative maker/taker fees, whereas V2 POST may
    // report an average. Require both cumulative fields; absence is not zero.
    const cumulativeFeeCents=d.maker_fees_dollars!=null&&d.taker_fees_dollars!=null
      &&brokerDecimal(d.maker_fees_dollars)&&brokerDecimal(d.taker_fees_dollars)
      ?dollarCentsExact(d.maker_fees_dollars)+dollarCentsExact(d.taker_fees_dollars):null;
    const brokerError = brokerErrorFields(raw);
    return {
      ok: Boolean(raw),
      ambiguous,
      orderId: d.order_id || null,
      clientOrderId,
      status: d.status || null,
      fillCount,
      remainingCount: fp(d.remaining_count_fp ?? d.remaining_count),
      averageFillPriceCents: d.average_fill_price != null
        ? dollarCentsExact(d.average_fill_price)
        : d.yes_price_dollars != null ? dollarCentsExact(d.yes_price_dollars) : null,
      feePaidCents: averageFeePaidCents == null ? cumulativeFeeCents : averageFeePaidCents * fillCount,
      ...brokerError,
      exchangeIndex: finiteExchangeIndex(d.exchange_index),
      raw,
    };
  }

  // R12: A fill history is usable only after every cursor page is validated.
  // An error, repeated cursor, malformed response, mismatched order, or page
  // cap produces NO economic truth; a partial sum must never reach the ledger.
  async fillTruth(orderId) {
    const incomplete = reason => ({ authoritative:false, reason, count:null,
      averageFillPriceCents:null, feeCostCents:null });
    if (!orderId) return incomplete('missing_order_id');
    let cursor = '';
    const seenCursors = new Set();
    const seenFillIds = new Set();
    let count = 0, notional = 0, feeCostCents = 0, feeComplete = true;
    for (let page = 0; page < 200; page += 1) {
      let r;
      try {
        r = await this.request('GET', `/portfolio/fills?order_id=${encodeURIComponent(orderId)}&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      } catch { return incomplete('fill_history_request_exception'); }
      if (!r?.ok) return incomplete('fill_history_request_failed');
      if (!Array.isArray(r.data?.fills)) return incomplete('fill_history_malformed_page');
      for (const f of r.data.fills) {
        if (f?.order_id != null && String(f.order_id) !== String(orderId)) return incomplete('fill_history_wrong_order');
        const fillId = f?.fill_id ?? f?.id;
        if (fillId != null) {
          if (seenFillIds.has(String(fillId))) return incomplete('fill_history_duplicate_fill_id');
          seenFillIds.add(String(fillId));
        }
        const rawCount = f?.count_fp ?? f?.count;
        const c = Number(rawCount);
        if (!brokerDecimal(rawCount) || c <= 0) return incomplete('fill_history_invalid_quantity');
        const isDollars=f.yes_price_dollars!=null||f.price_dollars!=null;
        const rawPrice=isDollars?(f.yes_price_dollars??f.price_dollars):(f.yes_price??f.price);
        if(!brokerDecimal(rawPrice))return incomplete('fill_history_invalid_price');
        const px=Number(rawPrice)*(isDollars?100:1);
        if (!Number.isFinite(px) || px <= 0 || px > 100) return incomplete('fill_history_invalid_price');
        count += c;
        notional += c * px;
        if (f.fee_cost == null) feeComplete = false;
        else {
          const rawFee = Number(f.fee_cost);
          if (!brokerDecimal(f.fee_cost)) return incomplete('fill_history_invalid_fee');
          feeCostCents += rawFee * 100;
        }
      }
      const next = r.data.cursor;
      if (next != null && typeof next !== 'string') return incomplete('fill_history_invalid_cursor');
      cursor = String(next || '');
      if (!cursor) return { authoritative:true, reason:null, count,
        averageFillPriceCents:count > 0 ? notional / count : null,
        feeCostCents:feeComplete ? feeCostCents : null,
        notionalCents:notional, pages:page+1 };
      if (seenCursors.has(cursor)) return incomplete('fill_history_repeated_cursor');
      seenCursors.add(cursor);
    }
    return incomplete('fill_history_page_limit');
  }

  // Order summaries and the complete fill ledger must agree before any
  // terminal/no-fill decision or cumulative position delta is accepted.
  async verifiedOrder(raw, clientOrderId) {
    const invalid=brokerReceiptError(raw,{clientOrderId});
    if(invalid)return {found:true,authoritative:false,order:null,reason:invalid};
    const order = this.resultFrom(raw, clientOrderId);
    const reportedStatus=raw?.status;
    if(reportedStatus!=null&&!BROKER_TERMINAL.has(String(reportedStatus))&&!BROKER_ACTIVE.has(String(reportedStatus)))
      return {found:true,authoritative:false,order:null,reason:'broker_order_status_unknown'};
    if(BROKER_TERMINAL.has(String(reportedStatus))&&order.remainingCount>0)
      return {found:true,authoritative:false,order:null,reason:'broker_terminal_remaining_conflict'};
    if (!order.orderId) return { found:true, authoritative:false, order:null, reason:'broker_order_id_missing' };
    const fills = await this.fillTruth(order.orderId);
    if (!fills?.authoritative) return { found:true, authoritative:false, order:null, reason:fills?.reason || 'fill_history_unavailable' };
    const hasSummaryCount = raw?.fill_count_fp != null || raw?.fill_count != null;
    if (hasSummaryCount && Math.abs(Number(order.fillCount)-fills.count)>1e-7)
      return { found:true, authoritative:false, order:null, reason:'broker_fill_count_mismatch' };
    if (!hasSummaryCount && fills.count === 0)
      return { found:true, authoritative:false, order:null, reason:'broker_zero_fill_count_unverified' };
    if (fills.count > 0) {
      if (fills.averageFillPriceCents == null) return { found:true, authoritative:false, order:null, reason:'broker_fill_price_unverified' };
      const summaryFee = order.feePaidCents;
      if (fills.feeCostCents != null && summaryFee != null && Math.abs(fills.feeCostCents-summaryFee)>0.011)
        return { found:true, authoritative:false, order:null, reason:'broker_fill_fee_mismatch' };
      if (fills.feeCostCents == null && summaryFee == null)
        return { found:true, authoritative:false, order:null, reason:'broker_fill_fee_unverified' };
      order.fillCount = fills.count;
      order.averageFillPriceCents = fills.averageFillPriceCents;
      order.feePaidCents = fills.feeCostCents ?? summaryFee;
    } else {
      order.fillCount = 0;
      order.feePaidCents = 0;
    }
    // Fixed-point GET responses can omit status. Derive only after exact-order
    // identity, remaining quantity and ALL fill pages have been verified. A
    // V2 POST receipt alone never reaches this branch and cannot prove terminality.
    if(reportedStatus==null){
      order.status=order.remainingCount>0?'resting':order.fillCount>0?'executed':'canceled';
      order.statusEvidence='verified_order_remaining_and_complete_fills';
    }
    return { found:true, authoritative:true, order };
  }

  async inspectOrderById(orderId, clientOrderId = null, expectedTicker = null) {
    if (!orderId) return { found:false, authoritative:false, order:null };
    let r;
    try { r = await this.request('GET', `/portfolio/orders/${encodeURIComponent(orderId)}`); }
    catch { return { found:false, authoritative:false, order:null }; }
    if (!r?.ok || !r.data?.order) return { found:false, authoritative:false, order:null };
    const raw = r.data.order;
    if (clientOrderId && String(raw.client_order_id || '') !== String(clientOrderId))
      return { found:true, authoritative:false, order:null, mismatch:true };
    if (String(raw.order_id || '') !== String(orderId))
      return { found:true, authoritative:false, order:null, mismatch:true };
    if (expectedTicker && String(raw.ticker||'') !== String(expectedTicker))
      return { found:true, authoritative:false, order:null, mismatch:true, reason:'broker_order_ticker_mismatch' };
    return this.verifiedOrder(raw, raw.client_order_id || clientOrderId);
  }

  // R11: A first-page-only query is not proof of order absence. Consume every
  // cursor page, fail closed on truncation, and retain ambiguity on API errors.
  async inspectOrderByClientId(ticker, clientOrderId, minTsSec, attempts = 6) {
    const maxPages = 200;
    for (let i = 0; i < attempts; i += 1) {
      let cursor = '';
      let complete = false;
      const seen = new Set();
      for (let page = 0; page < maxPages; page += 1) {
        const path = `/portfolio/orders?ticker=${encodeURIComponent(ticker)}&min_ts=${Math.max(0, Math.floor(Number(minTsSec) || 0))}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        let r;
        try { r = await this.request('GET', path); } catch { break; }
        if (!r?.ok || !Array.isArray(r.data?.orders)) break;
        const raw = r.data.orders.find(x => x.client_order_id === clientOrderId);
        if (raw) {
          if (String(raw.ticker||'')!==String(ticker))
            return {found:true,authoritative:false,order:null,mismatch:true,reason:'broker_order_ticker_mismatch'};
          return this.verifiedOrder(raw, clientOrderId);
        }
        cursor = String(r.data.cursor || '');
        if (!cursor) { complete = true; break; }
        if (seen.has(cursor)) break;
        seen.add(cursor);
      }
      if (complete) return { found: false, authoritative: true, order: null };
      if (i + 1 < attempts) await sleep(500 + i * 250);
    }
    return { found: false, authoritative: false, order: null };
  }


  async inspectOrderHistoryByClientPrefix(ticker, clientOrderPrefix, minTsSec, { maxPages = 12 } = {}) {
    const prefix = String(clientOrderPrefix || '');
    if (!ticker || !prefix) return { found: false, authoritative: false, orders: [], fillCount: 0, notionalCents: 0, feePaidCents: 0, averageFillPriceCents: null };
    let cursor = '';
    let pages = 0;
    let authoritative = true;
    const matched = [];
    const seenOrderIds = new Set();
    const seenCursors = new Set();
    do {
      const path = `/portfolio/orders?ticker=${encodeURIComponent(ticker)}&min_ts=${Math.max(0, Math.floor(Number(minTsSec) || 0))}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const r = await this.request('GET', path);
      if (!r?.ok || !Array.isArray(r.data?.orders)) { authoritative = false; break; }
      pages += 1;
      for (const raw of r.data.orders) {
        const cid = String(raw?.client_order_id || '');
        if (!cid.startsWith(prefix)) continue;
        const rr = this.resultFrom(raw, cid);
        if (!rr.orderId || (String(raw.ticker||'') !== String(ticker))) { authoritative = false; continue; }
        if (seenOrderIds.has(rr.orderId)) { authoritative = false; continue; }
        seenOrderIds.add(rr.orderId);
        const verified = await this.verifiedOrder(raw, cid);
        if (!verified.authoritative) { authoritative = false; continue; }
        matched.push(verified.order);
      }
      const next = r.data.cursor;
      if (next != null && typeof next !== 'string') { authoritative = false; break; }
      cursor = String(next || '');
      if (cursor && seenCursors.has(cursor)) { authoritative = false; break; }
      if (cursor) seenCursors.add(cursor);
    } while (cursor && pages < Math.max(1, Math.floor(Number(maxPages) || 1)));

    // A non-empty cursor after the bounded walk means the requested history was
    // not exhausted. Never call a partial history authoritative: doing so could
    // double-apply a fill that exists on an unvisited page.
    if (cursor) authoritative = false;
    let fillCount = 0;
    let notionalCents = 0;
    let feePaidCents = 0;
    for (const order of matched) {
      const count = fp(order.fillCount);
      const px = Number(order.averageFillPriceCents);
      if (count <= 0 || !Number.isFinite(px)) continue;
      fillCount += count;
      notionalCents += count * px;
      if (Number.isFinite(Number(order.feePaidCents))) feePaidCents += Number(order.feePaidCents);
    }
    return {
      found: matched.length > 0,
      authoritative,
      orders: matched,
      fillCount,
      notionalCents,
      feePaidCents,
      averageFillPriceCents: fillCount > 0 ? notionalCents / fillCount : null,
      pages,
    };
  }

  async findOrderByClientId(ticker, clientOrderId, minTsSec, attempts = 6) {
    const inspected = await this.inspectOrderByClientId(ticker, clientOrderId, minTsSec, attempts);
    return inspected.order;
  }

  async preflightExchangeBalance({ ticker, exchangeIndex = null, requiredCents = 0 } = {}) {
    let idx = finiteExchangeIndex(exchangeIndex);
    if (idx == null && ticker) {
      const market = await this.getMarket(ticker).catch(() => null);
      idx = finiteExchangeIndex(market?.exchangeIndex);
    }
    if (idx == null) return { ok:false, reason:'live_exchange_index_unavailable', exchangeIndex:null, availableCents:null, requiredCents:Number(requiredCents)||0 };
    let balance;
    try { balance = await this.getBalance(); }
    catch (error) {
      return { ok:false, reason:'live_exchange_balance_unavailable', exchangeIndex:idx, availableCents:null, requiredCents:Number(requiredCents)||0, message:String(error?.message||error) };
    }
    const availableCents = exchangeBalanceCents(balance, idx);
    const need = Math.max(0, Number(requiredCents) || 0);
    if (availableCents == null) return { ok:false, reason:'live_exchange_balance_unavailable', exchangeIndex:idx, availableCents:null, requiredCents:need };
    if (availableCents + 1e-9 < need) return { ok:false, reason:'live_exchange_insufficient_balance', exchangeIndex:idx, availableCents, requiredCents:need };
    return { ok:true, reason:'live_exchange_balance_ready', exchangeIndex:idx, availableCents, requiredCents:need };
  }

  async transferExchangeShardBalance({ sourceExchangeIndex, destinationExchangeIndex, amountCents, sourceSubaccount = 0, destinationSubaccount = 0 } = {}) {
    const source = finiteExchangeIndex(sourceExchangeIndex);
    const destination = finiteExchangeIndex(destinationExchangeIndex);
    const cents = Math.max(0, Number(amountCents) || 0);
    const amountCenticents = Math.ceil(cents * 100 - 1e-9);
    if (source == null || destination == null || source === destination || amountCenticents <= 0) {
      return { ok:false, reason:'live_exchange_rebalance_invalid_request', sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:cents };
    }
    const payload = {
      source:'event_contract',
      destination:'event_contract',
      amount:amountCenticents,
      source_exchange_shard:source,
      destination_exchange_shard:destination,
      source_subaccount:Math.max(0, Math.trunc(Number(sourceSubaccount) || 0)),
      destination_subaccount:Math.max(0, Math.trunc(Number(destinationSubaccount) || 0)),
    };
    let r;
    try {
      r = await this.request('POST', '/portfolio/intra_exchange_instance_transfer', payload, { mutation:true, timeoutMs:12000 });
    } catch (error) {
      return { ok:false, reason:'live_exchange_rebalance_failed', sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:amountCenticents/100, message:String(error?.message||error) };
    }
    if (!r?.ok) {
      const err = brokerErrorFields(r?.data || {});
      const status=Number(r?.status||0);
      const ambiguous=status===0||status===408||status===425||status===429||status>=500;
      return { ok:false, reason:ambiguous?'live_exchange_rebalance_ambiguous':'live_exchange_rebalance_failed', ambiguous, sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:amountCenticents/100, httpStatus:status, ...err };
    }
    return { ok:true, reason:'live_exchange_rebalance_accepted', transferId:r.data?.transfer_id||null, sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:amountCenticents/100 };
  }

  async ensureExchangeBalance({ ticker, exchangeIndex = null, requiredCents = 0 } = {}) {
    let idx = finiteExchangeIndex(exchangeIndex);
    if (idx == null && ticker) {
      const market = await this.getMarket(ticker).catch(() => null);
      idx = finiteExchangeIndex(market?.exchangeIndex);
    }
    const need = Math.max(0, Number(requiredCents) || 0);
    if (idx == null) return { ok:false, reason:'live_exchange_index_unavailable', exchangeIndex:null, availableCents:null, requiredCents:need };

    let balance;
    try { balance = await this.getBalance(); }
    catch (error) {
      return { ok:false, reason:'live_exchange_balance_unavailable', exchangeIndex:idx, availableCents:null, requiredCents:need, message:String(error?.message||error) };
    }
    const availableCents = exchangeBalanceCents(balance, idx);
    if (availableCents == null) return { ok:false, reason:'live_exchange_balance_unavailable', exchangeIndex:idx, availableCents:null, requiredCents:need };
    if (availableCents + 1e-9 >= need) {
      this.exchangeFundingInFlight.delete(idx);
      return { ok:true, reason:'live_exchange_balance_ready', exchangeIndex:idx, availableCents, requiredCents:need, rebalanced:false };
    }

    // Kalshi processes cross-shard transfers asynchronously. A previously
    // accepted funding request is therefore not treated as spendable cash
    // until a fresh balance response proves it arrived. This is deliberately
    // fail-closed and lets the next normal entry evaluation re-run all market,
    // Game Clock and Athena execution-envelope checks before any BUY.
    const pending = this.exchangeFundingInFlight.get(idx);
    if (pending && Date.now() - Number(pending.requestedAtMs || 0) < 30000) {
      // A fresh increase in the destination balance proves the prior transfer
      // made progress. If it was only a partial funding step, release the
      // local guard so the next exact shortfall can be transferred now rather
      // than waiting for the whole 30-second ambiguity window.
      if (availableCents <= Number(pending.availableBeforeCents ?? availableCents) + 1e-9) {
        return { ok:false, reason:'live_exchange_rebalance_pending', retryable:true, exchangeIndex:idx, availableCents, requiredCents:need, transferIds:[...(pending.transferIds||[])], fundingRequestedCents:Number(pending.fundingRequestedCents||0), ambiguous:pending.ambiguous===true };
      }
      this.exchangeFundingInFlight.delete(idx);
    }
    else this.exchangeFundingInFlight.delete(idx);

    const rows = Array.isArray(balance?.balance_breakdown) ? balance.balance_breakdown : [];
    const donors = rows
      .map((row) => ({ exchangeIndex:finiteExchangeIndex(row?.exchange_index), availableCents:Number.isFinite(Number(row?.balance)) ? dollarCentsExact(row.balance) : 0 }))
      .filter((row) => row.exchangeIndex != null && row.exchangeIndex !== idx && row.availableCents > 0)
      .sort((a,b) => b.availableCents - a.availableCents);
    let shortage = Math.max(0, need - availableCents);
    const donorAvailableCents = donors.reduce((sum,row) => sum + row.availableCents, 0);
    if (donorAvailableCents + 1e-9 < shortage) {
      return { ok:false, reason:'live_account_insufficient_balance', exchangeIndex:idx, availableCents, requiredCents:need, transferableCents:donorAvailableCents };
    }

    // One asynchronous account mutation per evaluation. This is deliberately
    // conservative: if the exact shortfall spans multiple donor shards, the
    // next normal evaluation observes the first transfer in the balance API,
    // re-runs every entry guard, and requests only the remaining shortfall.
    const donor=donors[0];
    const moveCents=Math.min(shortage,Number(donor?.availableCents||0));
    if (!donor || moveCents<=0) return { ok:false, reason:'live_account_insufficient_balance', exchangeIndex:idx, availableCents, requiredCents:need, transferableCents:donorAvailableCents };
    const moved=await this.transferExchangeShardBalance({sourceExchangeIndex:donor.exchangeIndex,destinationExchangeIndex:idx,amountCents:moveCents});
    if(!moved?.ok){
      if(moved?.ambiguous===true){
        this.exchangeFundingInFlight.set(idx,{requestedAtMs:Date.now(),transferIds:[],fundingRequestedCents:moveCents,requiredCents:need,availableBeforeCents:availableCents,ambiguous:true});
        return {...moved,ok:false,reason:'live_exchange_rebalance_ambiguous',retryable:true,exchangeIndex:idx,availableCents,requiredCents:need,fundingRequestedCents:moveCents,transferIds:[]};
      }
      return { ...moved, ok:false, reason:'live_exchange_rebalance_failed', exchangeIndex:idx, availableCents, requiredCents:need, transfers:[] };
    }
    const transferIds=[moved.transferId].filter(Boolean);
    this.exchangeFundingInFlight.set(idx,{requestedAtMs:Date.now(),transferIds,fundingRequestedCents:Number(moved.amountCents||moveCents),requiredCents:need,availableBeforeCents:availableCents,ambiguous:false});
    return { ok:false, reason:'live_exchange_rebalance_requested', retryable:true, exchangeIndex:idx, availableCents, requiredCents:need, fundingRequestedCents:Number(moved.amountCents||moveCents), transferIds, transfers:[moved] };
  }

  async placeOrder(args,{beforeDispatch=null,confirmDispatch=null}={}) {
    let payload;
    try{payload=this.buildOrder(args);}catch(error){
      return {ok:false,notSubmitted:true,ambiguous:false,httpStatus:0,fillCount:0,
        orderId:null,clientOrderId:args?.clientOrderId||null,
        localRejectionReason:String(error?.message||'invalid_order_arguments').slice(0,160)};
    }
    const minTs = Math.floor(Date.now() / 1000) - 120;
    let r;
    try {
      r = await this.request('POST', '/portfolio/events/orders', payload, { mutation: true, timeoutMs: 12000,
        beforeDispatch,confirmDispatch });
    } catch {
      r = { ok: false, status: 0, data: { error: 'network_error' } };
    }
    const invalid=r.ok?brokerReceiptError(r.data,{clientOrderId:args.clientOrderId}):null;
    if (r.ok&&!invalid) return { ...this.resultFrom(r.data, args.clientOrderId), httpStatus: r.status, ok: true };
    // Local refusal before transport is positive proof of non-submission. It
    // must not become an ambiguous broker order or start absence polling.
    if(r.notSubmitted===true)return {...this.resultFrom(r.data,args.clientOrderId),ok:false,ambiguous:false,
      notSubmitted:true,localRejectionReason:String(r.data?.error||'dispatch_not_authorized').slice(0,160),httpStatus:r.status};
    if (invalid || [0,408,409].includes(Number(r.status)) || Number(r.status)>=500) {
      // A server error or malformed success is not proof that the matching
      // engine did nothing. Look up the ORIGINAL client ID; never send again.
      const truth = await this.findOrderByClientId(args.ticker, args.clientOrderId, minTs).catch(()=>null);
      if (truth) return { ...truth, httpStatus: r.status };
      const unverified=this.resultFrom(r.data,args.clientOrderId,true);
      return {...unverified,ok:false,ambiguous:true,httpStatus:r.status,
        orderId:invalid==='broker_order_client_id_mismatch'?null:unverified.orderId,
        fillCount:0,averageFillPriceCents:null,feePaidCents:null,
        unverifiedFillCount:unverified.fillCount,reconciliationReason:invalid||'broker_submission_outcome_unknown'};
    }
    return { ...this.resultFrom(r.data, args.clientOrderId), ok: false, httpStatus: r.status };
  }
}

export function classifyLiveOrderResult(result = {}) {
  const fill = Number(result?.fillCount || 0);
  if (fill > 0) return { kind: 'fill', reason: 'live_fill' };
  if (result?.ambiguous === true) return { kind: 'ambiguous', reason: 'live_ambiguous_pending' };
  // A receipt that can still execute is not an IOC no-fill result. Keep the
  // original durable client ID until a terminal broker readback is available.
  const brokerStatus=String(result?.status||'').toLowerCase();
  if (result?.orderId && (BROKER_ACTIVE.has(brokerStatus)
      || ['active','accepted'].includes(brokerStatus) || Number(result?.remainingCount)>0))
    return {kind:'ambiguous',reason:'live_order_nonterminal_pending'};

  const status = Number(result?.httpStatus || 0);
  const msg = String(result?.brokerError || result?.error || result?.raw?.error || result?.raw?.message || '').toLowerCase();
  if (status === 429 || msg.includes('rate limit')) return { kind: 'rejected', reason: 'live_broker_rate_limited' };
  const hardStatus = [400, 401, 403, 404, 422].includes(status);
  const hardText = /insufficient|invalid|unauthorized|forbidden|not found|rejected|minimum|notional|balance/.test(msg);
  if (hardStatus || hardText) return { kind: 'rejected', reason: 'live_broker_rejected' };
  if (result?.ok === false && status >= 400 && status < 500 && status !== 409) return { kind: 'rejected', reason: 'live_broker_rejected' };
  return { kind: 'unfilled', reason: 'live_ioc_unfilled' };
}
