import {OPS_LIMITS,RequestLane,validateBalance,validateRestingOrders,finiteNumber,brokerReceiptDirection} from './operationalSafety.mjs';
import {q17AssertPublicMarketRequest} from './q17Profile.mjs';
import {performance} from 'node:perf_hooks';
import { createPrivateKey, constants, randomUUID, sign as cryptoSign } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { isMatchDecisionMarket } from './doctrine.mjs';
import {cloneClientOrderPrefix,cloneTag,validateCloneOrderIntent} from './cloneIdentity.mjs';

const TRANSPORT_CODES=new Set(['EAI_AGAIN','ENOTFOUND','ECONNREFUSED','ECONNRESET','ETIMEDOUT',
  'EHOSTUNREACH','ENETUNREACH','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
const transportCodeOf=error=>{
  const code=error?.cause?.code??error?.code;
  return TRANSPORT_CODES.has(code)?code:null;
};

const fp = (v) => Number.parseFloat(String(v ?? 0)) || 0;
const dollarCentsExact = (v) => fp(v) * 100;
// Quotes and executions use the same YES price scale, including hundredths
// of a cent. Never round a tradable subpenny price to a whole cent or turn
// malformed input into an invented quote. Absent quotes remain unavailable.
const marketCents = (dollars, legacy) => {
  const raw=dollars??legacy;
  if(raw==null)return 0;
  if(!brokerDecimal(raw))return 0;
  const cents=Number(raw)*(dollars!=null?100:1),centicents=cents*100;
  if(cents<0||cents>100||Math.abs(centicents-Math.round(centicents))>1e-7)return 0;
  return Math.round(centicents)/100;
};
const millis = (v) => v ? Date.parse(v) : 0;
// Exchange shards are exact integer identities. Never truncate a fractional,
// boolean, exponential or malformed index to a different funding destination.
const finiteExchangeIndex = (v) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)
  || (typeof v === 'string' && /^\d+$/.test(v) && Number.isSafeInteger(Number(v)))
  ? Number(v) : null;

export function exchangeBalanceCents(balance = {}, exchangeIndex = 0) {
  const idx = finiteExchangeIndex(exchangeIndex);
  if (idx == null) return null;
  const rows = Array.isArray(balance?.balance_breakdown) ? balance.balance_breakdown : null;
  // The account-wide balance includes ALL exchange indexes. Kalshi can omit
  // breakdown for restricted API keys; that is not proof of shard-0 funds.
  if (!rows) return null;
  const matches=rows.filter(x=>finiteExchangeIndex(x?.exchange_index)===idx);
  if (matches.length > 1) return null;
  if (!matches.length) return rows.length ? 0 : null;
  const raw=matches[0]?.balance;
  if (raw==null || typeof raw==='boolean' || String(raw).trim()===''
      || !brokerDecimal(raw)) return null;
  return dollarCentsExact(raw);
}

const brokerDecimal = value => ((typeof value==='number'&&Number.isFinite(value))
  ||(typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value)))
  &&Number.isFinite(Number(value))&&Number(value)>=0;
const BROKER_TERMINAL = new Set(['executed','filled','canceled','cancelled','rejected','expired']);
const BROKER_ACTIVE = new Set(['resting','pending','open']);

// The account gate and execution decoder share the same contract: canonical
// fields first, legacy action/side only as a fallback. Price remains YES-leg
// price; direction normalization must never invert fill prices or grant orders.
export function brokerDirectionError(raw, expectedBookSide, { requireDirection = true } = {}) {
  if(expectedBookSide == null)return null;
  if(!['bid','ask'].includes(expectedBookSide))return 'broker_expected_direction_invalid';
  const parsed=brokerReceiptDirection(raw);
  if(parsed.reason){
    if(!requireDirection&&parsed.reason==='broker_order_direction_missing')return null;
    // Preserve the existing diagnostic reason for an explicit wrong outcome;
    // malformed/conflicting canonical evidence remains a hard refusal.
    const d=raw?.order||raw;
    if(['yes','no'].includes(d?.outcome_side)
      &&(d.outcome_side==='yes'?'bid':'ask')!==expectedBookSide)
      return 'broker_order_outcome_mismatch';
    return parsed.reason;
  }
  if(parsed.bookSide!==expectedBookSide){
    const d=raw?.order||raw;
    return d?.outcome_side!=null||(parsed.source==='legacy'&&d?.side==='no')
      ?'broker_order_outcome_mismatch':'broker_order_direction_mismatch';
  }
  return null;
}

// Bounded receipt fields for diagnosing refusals. No raw responses, keys,
// request headers, credentials or account balances are retained here.
export function brokerDirectionEvidence(raw, expectedBookSide, stage='direction') {
  const d=raw?.order||raw||{};
  const out={stage:String(stage).slice(0,48),expectedBookSide:expectedBookSide??null};
  for(const key of ['order_id','fill_id','ticker','market_ticker','action','side','book_side','outcome_side']){
    if(d[key]!=null&&['string','number','boolean'].includes(typeof d[key]))out[key]=String(d[key]).slice(0,160);
  }
  return out;
}

// Receipt quantities must not use parseFloat's silent invalid-to-zero fallback.
// Both the fixed-point GET shape and the documented V2 POST shape are accepted.
// V2 POST legitimately omits status/ticker: do not impose GET-only fields there.
function brokerReceiptError(raw,{clientOrderId=null,requireCounts=true}={}){
  const d=raw?.order||raw;
  if(!d||typeof d!=='object'||Array.isArray(d))return 'broker_order_shape_invalid';
  if(typeof d.order_id!=='string'||!d.order_id.trim())return 'broker_order_id_missing';
  if(clientOrderId&&d.client_order_id!=null&&String(d.client_order_id)!==String(clientOrderId))
    return 'broker_order_client_id_mismatch';
  for(const key of ['subaccount_number','subaccount'])
    if(d[key]!=null&&finiteExchangeIndex(d[key])!==0)return 'broker_order_subaccount_mismatch';
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

// During archival a record can be returned by both tiers. Deduplicate only
// the SAME financial identity with agreeing evidence; neither a second fill
// nor a changed receipt may be silently swallowed as a migration overlap.
function brokerHistoryEquivalent(a,b,kind){
  const ticker=x=>x?.ticker??x?.market_ticker;
  if(ticker(a)!==ticker(b)||String(a?.order_id||'')!==String(b?.order_id||''))return false;
  const da=brokerReceiptDirection(a),db=brokerReceiptDirection(b);
  if(da.reason||db.reason||da.bookSide!==db.bookSide)return false;
  for(const key of ['client_order_id','exchange_index','subaccount_number','subaccount'])
    if(a[key]!=null&&b[key]!=null&&String(a[key])!==String(b[key]))return false;
  if(a.created_time!=null&&b.created_time!=null
    &&Date.parse(String(a.created_time))!==Date.parse(String(b.created_time)))return false;
  const agree=(x,y,scaleX=1,scaleY=1)=>x==null||y==null
    ||brokerDecimal(x)&&brokerDecimal(y)&&Math.abs(Number(x)*scaleX-Number(y)*scaleY)<=1e-7;
  const price=x=>(x.yes_price_dollars??x.price_dollars)!=null
    ?[x.yes_price_dollars??x.price_dollars,100]:[x.yes_price??x.price,1];
  const [ap,as]=price(a),[bp,bs]=price(b);
  if(!agree(ap,bp,as,bs))return false;
  if(kind==='fills')return agree(a.count_fp??a.count,b.count_fp??b.count)&&agree(a.fee_cost,b.fee_cost);
  if(a.status!=null&&b.status!=null&&String(a.status)!==String(b.status))return false;
  for(const [x,y] of [[a.fill_count_fp??a.fill_count,b.fill_count_fp??b.fill_count],
    [a.remaining_count_fp??a.remaining_count,b.remaining_count_fp??b.remaining_count],
    [a.initial_count_fp??a.initial_count,b.initial_count_fp??b.initial_count],
    [a.maker_fees_dollars,b.maker_fees_dollars],[a.taker_fees_dollars,b.taker_fees_dollars],
    [a.average_fee_paid,b.average_fee_paid],[a.average_fill_price,b.average_fill_price]])if(!agree(x,y))return false;
  return true;
}

function mergeBrokerHistory(live,archived,{kind,ticker}){
  const merged=new Map(),historicalOnly=new Set();
  for(const [tier,rows] of [['live',live],['historical',archived]]){
    const seen=new Set();
    for(const raw of rows){
      const id=kind==='fills'?(raw?.fill_id??raw?.id):raw?.order_id;
      if(typeof id!=='string'||!id.trim()||typeof raw!=='object'
        ||String(raw.ticker??raw.market_ticker??'')!==String(ticker))throw Error(`broker_${kind}_history_identity_invalid`);
      if(seen.has(id))throw Error(`broker_${kind}_history_duplicate_identity`);
      seen.add(id);
      const previous=merged.get(id);
      if(previous){
        if(!brokerHistoryEquivalent(previous,raw,kind))throw Error(`broker_${kind}_history_overlap_conflict`);
        // Preserve optional evidence present in just one tier, preferring the
        // current record for equal shared fields. Explicit contradictions were
        // rejected above and cannot be repaired by choosing one response.
        const combined={...raw};for(const [key,value] of Object.entries(previous))
          if(value!=null||combined[key]==null)combined[key]=value;
        merged.set(id,combined);
      }else{merged.set(id,raw);if(tier==='historical')historicalOnly.add(id);}
    }
  }
  return {rows:[...merged.values()],historicalOnly};
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
    exchangeIndex: finiteExchangeIndex(m.exchange_index),
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
    closeTimeMs: millis(m.close_time ?? m.latest_expiration_time ?? m.expiration_time),
    occurrenceTimeMs: millis(m.occurrence_datetime),
    expectedExpirationMs: millis(m.expected_expiration_time),
    canCloseEarly: Boolean(m.can_close_early ?? true),
    recentTrades: 0,
    recentTradesObservedAtMs: 0,
    updatedAtMs: Number(m.ts_ms) || (m.updated_time ? millis(m.updated_time) : Date.now()),
  };
  // A bid does not establish an executable ask. The independent orderbook
  // read remains the source of liquidity; an absent ask is never synthesized.
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
    // This small cache is diagnostic only. PostgreSQL intent/receipt history
    // and the owner advisory lock below authorize all automatic transfers.
    this.exchangeFundingInFlight = new Map();
    // One balance-read / transfer decision per exchange shard at a time.
    this.exchangeBalanceChecks = new Set();
    this.fundingStore = null;
    this.readLane=new RequestLane(OPS_LIMITS.readConcurrency,OPS_LIMITS.readPending,{reservedConcurrency:2,reservedPending:16,entryReservedConcurrency:1});
    this.lastRequestFailure=null;
    this.readTelemetryStartedAtMs=Date.now();
    this.readCategoryTelemetry=new Map();
    this.mutationLane=new RequestLane(OPS_LIMITS.mutationConcurrency,OPS_LIMITS.mutationPending);
    // Kalshi meters ALL /portfolio/balance variants in their own no-burst
    // bucket (Basic/Advanced: one call per second). ReadConcurrency controls
    // overlap, not rate; the ordinary GET retry loop alone can cause 429s.
    // Serialize admission for this endpoint only. Never cache a balance as
    // current collateral, and never delay SELL/order traffic using this gate.
    this.balanceReadTail=Promise.resolve();
    this.balanceNextAllowedAtMs=0;
    // After a 429, assume a shared 1/s bucket across up to four deployments
    // and hold a fleet-safe gap. This does not require a shared database.
    // The gap decays only after a quiet minute with no further 429.
    this.balanceFleetSafeUntilMs=0;
    this.balanceLast429AtMs=0;
    this.balanceFleetSafeActivations=0;
    // Every clone uses only its own request pacing and durable clone identity.
    // Broker account budgets may still be shared externally; unavailable
    // broker evidence continues to fail closed without another database.
    this.balanceReadInFlight=null;
    this.balanceAuthorityGeneration=0;
    this.balanceReadCoalesced=0;
    this.balancePacingDeadlineCount=0;
  }

  setCredentials(c) {
    // A replacement credential may target a different exchange account.
    // Previously acquired balance proof cannot authorize that account.
    if(this.credentials?.keyId!==c?.keyId||this.credentials?.privateKeyPem!==c?.privateKeyPem)
      this.invalidateBalanceReadAuthority();
    this.credentials=c;
  }
  setCloneIdentity(identity){
    const id=String(identity?.id||''),tag=cloneTag(id);
    if(!tag||identity?.tag!==tag)throw new Error('clone_identity_invalid');
    if(this.cloneIdentity&&this.cloneIdentity.id!==id)throw new Error('clone_identity_immutable');
    this.cloneIdentity={...identity};
  }
  setFundingStore(store) { this.fundingStore = store; }
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

  async paceBalanceRead(deadline,authorityGeneration=this.balanceAuthorityGeneration) {
    // A queued balance request cannot acquire scarce shared rate-limit slots
    // after a credential switch or an exposure-changing broker mutation.
    const invalidated=()=>this.balanceAuthorityGeneration!==authorityGeneration;
    const rejected=()=>({ok:false,reason:'broker_balance_authority_invalidated'});
    const previous=this.balanceReadTail;
    let release;
    this.balanceReadTail=new Promise(resolve=>{release=resolve;});
    try {
      await previous;
      if(invalidated())return rejected();
      while(true){
        if(invalidated())return rejected();
        const remaining=deadline-performance.now();
        if(remaining<=0){this.balancePacingDeadlineCount++;return{ok:false,reason:'broker_balance_pacing_deadline_exceeded'};}
        const delay=Math.max(0,this.balanceNextAllowedAtMs-performance.now());
        if(delay<=0)break;
        if(delay>=remaining){this.balancePacingDeadlineCount++;return{ok:false,reason:'broker_balance_pacing_deadline_exceeded'};}
        await sleep(delay);
      }
      if(invalidated())return rejected();
      if(invalidated())return rejected();
      const now=performance.now();
      if(now>=deadline){this.balancePacingDeadlineCount++;return{ok:false,reason:'broker_balance_pacing_deadline_exceeded'};}
      const fleetSafe=performance.now()<this.balanceFleetSafeUntilMs;
      const gap=fleetSafe?4500:1100;
      this.balanceNextAllowedAtMs=now+gap;
      return{ok:true,fleetSafe,gapMs:gap};
    }finally{release();}
  }

  async deferBalanceReadOn429(attempt,retryAfterMs=0,{applyLocal=true}={}) {
    // A shared exchange balance bucket can reject clones that arrive in
    // lockstep. The old 0-250 ms jitter kept retries inside the same 1-second
    // broker bucket and made repeated collisions possible across deployments.
    // Decorrelate retries by up to 3.5 seconds; retain the >=4.5-second
    // safety gap, the 30-second request deadline, and no cached cash proof.
    const fleetGap=4500+Math.floor(Math.random()*3500);
    const delay=Math.max(fleetGap, Math.max(0,Math.min(300000,Number(retryAfterMs)||0)));
    // A late HTTP 429 from superseded credentials cannot throttle the
    // replacement account's local read schedule.
    if(applyLocal){
      this.balanceNextAllowedAtMs=Math.max(this.balanceNextAllowedAtMs,performance.now()+delay);
      this.balanceLast429AtMs=Date.now();
      this.balanceFleetSafeUntilMs=performance.now()+60_000;
      this.balanceFleetSafeActivations++;
    }
    return true;
  }

  invalidateBalanceReadAuthority(){
    this.balanceAuthorityGeneration++;
    this.balanceReadInFlight=null;
  }

  async fetchOnce(method, baseUrl, apiPath, body, timeoutMs, authenticated = true) {
    q17AssertPublicMarketRequest(method,apiPath);
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

  accountReadPath(apiPath) {
    const path=String(apiPath).split('?')[0];
    return /^\/portfolio(?:\/|$)/.test(path)
      || /^\/historical\/(?:orders|fills|positions|cutoff)(?:\/|$)/.test(path)
      || path==='/account/limits';
  }

  requestFailure(apiPath,result,{phase=null,critical=false}={}) {
    // Export codes from a finite vocabulary, never broker bodies, keys, signed
    // headers, URLs with query parameters, account identities or exception text.
    const status=Number.isInteger(result?.status)&&result.status>=0&&result.status<=599?result.status:0;
    const raw=result?.data?.error;
    const known=new Set(['broker_request_backpressure','broker_request_queue_expired',
      'broker_request_deadline_exceeded','broker_balance_pacing_deadline_exceeded',
      'broker_shared_balance_pacing_deadline_exceeded','broker_shared_balance_pacing_unavailable',
      'broker_balance_authority_invalidated','broker_shared_balance_pacing_reservation_revoked',
      'broker_shared_balance_pacing_slot_expired',
      'broker_shared_pacing_configuration_conflict',
      'broker_response_size_limit','timeout','request_failed']);
    const reason=known.has(raw)?raw:status===429?'broker_rate_limited':status===401||status===403?'broker_authentication_refused'
      :status>0?'broker_http_error':'broker_transport_failed';
    const path=String(apiPath).split('?')[0];
    const endpoint=path==='/portfolio/balance'?'balance':path==='/portfolio/positions'?'positions'
      :/^\/(?:portfolio|historical)\/orders(?:\/|$)/.test(path)?'orders'
      :/^\/(?:portfolio|historical)\/fills(?:\/|$)/.test(path)?'fills'
      :path==='/portfolio/settlements'?'settlements':path==='/account/limits'?'account_limits'
      :/\/orderbook$/.test(path)?'orderbook':this.accountReadPath(path)?'account_other':'market_other';
    return {atMs:Date.now(),endpoint,status,reason,
      transportCode:TRANSPORT_CODES.has(result?.transportCode)?result.transportCode:null,
      phase:phase||(reason==='broker_request_backpressure'||reason==='broker_request_queue_expired'?'queue'
        :reason==='broker_balance_pacing_deadline_exceeded'?'balance_pacing'
        :reason==='broker_request_deadline_exceeded'?'deadline':status>0?'http_response':'transport'),
      critical:critical===true,notSubmitted:result?.notSubmitted===true,
      // Counts transport invocations attempted before the final refusal;
      // this is NOT a claim that the exchange accepted an order or request.
      priorAttemptsSubmitted:Number.isSafeInteger(result?.priorAttemptsSubmitted)
        ?Math.max(0,result.priorAttemptsSubmitted):null,
      // Preserve the first broker 429 / 5xx even when the LAST attempt expires
      // locally in pacing. Never log exchange bodies or credentials.
      originatingHttpStatus:Number.isInteger(result?.originatingHttpStatus)?result.originatingHttpStatus:null,
      originatingReason:typeof result?.originatingReason==='string'?result.originatingReason:null,
      pacingDelayMs:Number.isFinite(result?.pacingDelayMs)?Math.max(0,Math.ceil(result.pacingDelayMs)):null,
      reads:this.readLane.snapshot()};
  }

  accountReadError(label,result,apiPath) {
    const failure=result?.requestFailure||this.requestFailure(apiPath,result,{critical:true});
    const error=new Error(`${label}_request_failed:${failure.reason}${failure.transportCode?':'+failure.transportCode:''}:http_${failure.status}`);
    // The operational worker records error.code; preserve the sanitized broker
    // failure category rather than losing it as the generic string 'Error'.
    error.code=failure.reason;
    error.brokerFailure=failure;
    this.lastRequestFailure=failure;
    return error;
  }

  async request(method,apiPath,body=null,options={}){
    q17AssertPublicMarketRequest(method,apiPath);
    // Only IDENTICAL unscoped GETs already in-flight may share proof; there is
    // no finished-value balance cache. Any broker mutation invalidates every
    // old generation, including requests that finish after the mutation.
    if(method.toUpperCase()==='GET' && apiPath==='/portfolio/balance'
      && options.mutation!==true && !Number.isFinite(options.deadline)){
      const generation=this.balanceAuthorityGeneration;
      const existing=this.balanceReadInFlight;
      if(existing?.generation===generation){
        this.balanceReadCoalesced++;
        const result=await existing.promise;
        return this.balanceAuthorityGeneration===generation?result:
          {ok:false,status:0,notSubmitted:true,data:{error:'broker_balance_authority_invalidated'}};
      }
      const promise=this.requestUncoalesced(method,apiPath,body,options);
      const entry={generation,promise};
      this.balanceReadInFlight=entry;
      try{
        const result=await promise;
        return this.balanceAuthorityGeneration===generation?result:
          {ok:false,status:0,notSubmitted:true,data:{error:'broker_balance_authority_invalidated'}};
      }finally{if(this.balanceReadInFlight===entry)this.balanceReadInFlight=null;}
    }
    return this.requestUncoalesced(method,apiPath,body,options);
  }
  // Only endpoint CLASSES, never full URLs, symbols, tokens or response
  // bodies. Counts describe completed lane jobs (including retries), not
  // individual HTTP attempts or the authenticated account's tier budget.
  readCategory(apiPath='') {
    const path=String(apiPath).split('?')[0];
    if(/^\/portfolio\/balance$/.test(path))return 'balance';
    if(/^\/portfolio\//.test(path))return 'portfolio';
    if(/^\/live_data\/milestone\/[^/]+\/game_stats$/.test(path))return 'sporting_stats';
    if(/^\/live_data\/milestone\/[^/]+$/.test(path))return 'sporting_live';
    if(/^\/milestones(?:\/|$)/.test(path))return 'sporting_milestone';
    if(/^\/markets\/[^/]+\/orderbook$/.test(path))return 'market_orderbook';
    if(/^\/markets\/[^/]+$/.test(path))return 'market_single';
    if(path==='/markets/trades')return 'market_trades';
    if(path==='/markets'||path==='/events')return 'market_discovery';
    if(/^\/markets\//.test(path))return 'market_other';
    return 'other';
  }

  recordReadCategory(apiPath,result,latencyMs,queueWaitMs=0,transport={}) {
    const key=this.readCategory(apiPath),prior=this.readCategoryTelemetry.get(key)||
      {completed:0,failures:0,rateLimited:0,totalLatencyMs:0,maxLatencyMs:0,
        queueWaitTotalMs:0,queueWaitMaxMs:0,serviceTimeTotalMs:0,serviceTimeMaxMs:0,
        httpAttempts:0,retries:0,rateLimitedAttempts:0};
    prior.completed++;
    if(result?.ok!==true)prior.failures++;
    if(Number(result?.status)===429||Number(result?.originatingHttpStatus)===429
      ||Number(result?.requestFailure?.originatingHttpStatus)===429||Number(transport.rateLimitedAttempts)>0)prior.rateLimited++;
    const ms=Math.max(0,Math.round(Number(latencyMs)||0));
    prior.totalLatencyMs+=ms;prior.maxLatencyMs=Math.max(prior.maxLatencyMs,ms);
    const queueMs=Math.max(0,Math.round(Number(queueWaitMs)||0));
    prior.queueWaitTotalMs+=queueMs;prior.queueWaitMaxMs=Math.max(prior.queueWaitMaxMs,queueMs);
    const serviceMs=Math.max(0,ms-queueMs),attempts=Math.max(0,Number(transport.attempts)||0);
    prior.serviceTimeTotalMs+=serviceMs;prior.serviceTimeMaxMs=Math.max(prior.serviceTimeMaxMs,serviceMs);
    prior.httpAttempts+=attempts;prior.retries+=Math.max(0,attempts-1);
    prior.rateLimitedAttempts+=Math.max(0,Number(transport.rateLimitedAttempts)||0);
    this.readCategoryTelemetry.set(key,prior);
  }

  async requestUncoalesced(method,apiPath,body=null,options={}){
    const readTelemetryAtMs=performance.now();
    const mutation=method.toUpperCase()!=='GET'||options.mutation===true;
    const critical=!mutation&&(this.accountReadPath(apiPath)
      ||options.protectiveRead===true&&/^\/markets\/[^/]+(?:\/orderbook)?(?:\?|$)/.test(apiPath));
    const priority=!mutation&&/\/orderbook(?:\?|$)/.test(apiPath)?'book'
      :!mutation&&options.entryIntent===true&&/^\/live_data\/milestone\//.test(apiPath)?'clock':'normal';
    const deadline=Math.min(performance.now()+OPS_LIMITS.requestBudgetMs,
      Number.isFinite(options.deadline)?options.deadline:Infinity);
    const lane=mutation?this.mutationLane:this.readLane;
    let started=false,result,queueWaitMs=0;const requestTelemetry={attempts:0,rateLimitedAttempts:0};
    try{result=await lane.run(async()=>{started=true;
      if(!mutation)queueWaitMs=Math.max(0,performance.now()-readTelemetryAtMs);
      const dispatch=()=>this.requestWithBudget(method,apiPath,body,{...options,mutation,deadline,requestTelemetry});
      if(mutation){
        // Keep exact clone ID, installation binding and order provenance
        // checks without using a shared database or account-wide mutation lock.
        if(method.toUpperCase()==='POST'&&apiPath==='/portfolio/events/orders'){
          const claim=validateCloneOrderIntent({
            tag:this.cloneIdentity?.tag,bindingHash:this.cloneIdentity?.bindingHash,
            clientOrderId:body?.client_order_id,ticker:body?.ticker});
          if(!claim.ok)return{ok:false,status:0,notSubmitted:true,data:{error:claim.reason}};
        }
        return dispatch();
      }
      return dispatch();
    },deadline,{critical,priority,owner:`${method}:${this.readCategory(apiPath)}:${String(body?.client_order_id||'').slice(0,100)}`});}
    catch(error){result={ok:false,status:0,...(!started?{notSubmitted:true}:{}),data:{error:String(error?.message||'broker_request_failed')},transportCode:transportCodeOf(error)};}
    finally{if(mutation&&result?.notSubmitted!==true){this.invalidateBalanceReadAuthority();this.onAccountMutation?.({method,apiPath,clientOrderId:body?.client_order_id,side:body?.side,phase:'finished'});}}
    if(!result.ok&&!mutation){
      const failure=this.requestFailure(apiPath,result,{critical,phase:!started?'queue':null});
      this.lastRequestFailure=failure;
      // Keep per-request provenance: concurrent failures cannot attribute another
      // endpoint's error to the LIVE request that is actually being refused.
      result={...result,requestFailure:failure};
    }
    if(!mutation)this.recordReadCategory(apiPath,result,performance.now()-readTelemetryAtMs,
      started?queueWaitMs:performance.now()-readTelemetryAtMs,requestTelemetry);
    return result;
  }
  localBalancePacingSnapshot(){
    return{version:'BALANCE-LOCAL-PACING-V1',scope:'independent',
      coalesced:this.balanceReadCoalesced,
      deadlineExpirations:this.balancePacingDeadlineCount,
      fleetSafeActive:performance.now()<this.balanceFleetSafeUntilMs,
      fleetSafeActivations:this.balanceFleetSafeActivations,
      last429AtMs:this.balanceLast429AtMs||null};
  }
  resourceSnapshot(){return{reads:this.readLane.snapshot(),mutations:this.mutationLane.snapshot(),
    responseByteLimit:OPS_LIMITS.responseBytes,lastFailure:this.lastRequestFailure,
    readCategories:{version:'MW-READ-CATEGORIES-V1',sinceMs:this.readTelemetryStartedAtMs,
      counts:Object.fromEntries([...this.readCategoryTelemetry].map(([key,v])=>
        [key,{...v,averageLatencyMs:v.completed?Math.round(v.totalLatencyMs/v.completed):0,
          averageQueueWaitMs:v.completed?Math.round(v.queueWaitTotalMs/v.completed):0}]))},
    balancePacing:{pendingInFlight:this.balanceReadInFlight!==null,
      coalesced:this.balanceReadCoalesced,deadlineExpirations:this.balancePacingDeadlineCount,
      fleetSafeActive:performance.now()<this.balanceFleetSafeUntilMs,
      fleetSafeActivations:this.balanceFleetSafeActivations}};}

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
    requestTelemetry = null,
    deadline=performance.now()+OPS_LIMITS.requestBudgetMs,
  } = {}) {
    mutation=mutation||method.toUpperCase()!=='GET';
    const primaryHosts = [this.baseUrl, this.fallbackBaseUrl].filter((x, i, a) => x && a.indexOf(x) === i);
    const hosts = preferFallbackHost && primaryHosts.length > 1 ? [primaryHosts[1], primaryHosts[0]] : primaryHosts;
    let last = null;
    const balanceRead=method.toUpperCase()==='GET'&&/^\/portfolio\/balance(?:\?|$)/.test(apiPath);
    // Balance reads: 1 initial + 2 retries. Five exponential retries were
    // what exhausted the LIVE-activation deadline after shared-bucket 429s.
    const max = mutation?1:balanceRead?3:Math.max(1,Math.min(6,Math.floor(Number(maxAttempts)||6)));
    // A credential replacement or broker mutation supersedes every waiting
    // balance request; it must not later send under a different authority.
    const balanceReadGeneration=this.balanceAuthorityGeneration;
    let originatingHttpStatus=null,priorAttemptsSubmitted=0;
    const preceding=()=>({priorAttemptsSubmitted,...(originatingHttpStatus==null?{}:{originatingHttpStatus,
      originatingReason:originatingHttpStatus===429?'broker_rate_limited':'broker_http_retry_failed'})});
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
        if(balanceRead){
          const paced=await this.paceBalanceRead(deadline,balanceReadGeneration);
          if(!paced.ok)return {ok:false,status:0,notSubmitted:priorAttemptsSubmitted===0,
            data:{error:paced.reason},pacingDelayMs:Math.max(0,this.balanceNextAllowedAtMs-performance.now()),...preceding()};
          if(this.balanceAuthorityGeneration!==balanceReadGeneration)
            return{ok:false,status:0,notSubmitted:priorAttemptsSubmitted===0,
              data:{error:'broker_balance_authority_invalidated'},...preceding()};
        }
        const remaining=deadline-performance.now();
        if(remaining<=0)return{ok:false,status:0,
          ...((mutation||balanceRead)?{notSubmitted:priorAttemptsSubmitted===0}:{}),
          data:{error:'broker_request_deadline_exceeded'},...preceding()};
        if(mutation){this.invalidateBalanceReadAuthority();this.onAccountMutation?.({method,apiPath,clientOrderId:body?.client_order_id,side:body?.side,phase:'before_send'});}
        priorAttemptsSubmitted++;
        if(requestTelemetry)requestTelemetry.attempts++;
        const r = await this.fetchOnce(method, host, apiPath, body, Math.min(timeoutMs,remaining), authenticated);
        if(requestTelemetry&&Number(r.status)===429)requestTelemetry.rateLimitedAttempts++;
        last = r;
        // A superseded response cannot become new-account financial evidence.
        // On 429, first publish the throttle to the ORIGINAL scoped bucket.
        if(r.ok&&balanceRead&&this.balanceAuthorityGeneration!==balanceReadGeneration)
          return{ok:false,status:0,notSubmitted:false,
            data:{error:'broker_balance_authority_invalidated'},...preceding()};
        if (r.ok) return r;
        if (mutation) return r;
        const retryValue=r.headers?.get?.('retry-after');
        const retryAfter=retryValue==null?0:finiteNumber(retryValue)?Math.max(0,Number(retryValue)*1000):Math.max(0,Date.parse(retryValue)-Date.now())||0;
        if(balanceRead&&r.status===429){
          originatingHttpStatus??=429;
          await this.deferBalanceReadOn429(attempt,retryAfter,
            {applyLocal:this.balanceAuthorityGeneration===balanceReadGeneration});
        }
        if(balanceRead&&this.balanceAuthorityGeneration!==balanceReadGeneration)
          return{ok:false,status:0,notSubmitted:false,
            data:{error:'broker_balance_authority_invalidated'},...preceding()};
        const rateLimited = String(r.data?.error || r.data?.message || '').toLowerCase().includes('rate limit');
        if (![429, 502, 503, 504].includes(r.status) && !rateLimited) return r;
        if(!balanceRead){}else originatingHttpStatus??=r.status;
        if (attempt + 1 >= max) break;
        const delay=retryAfter||Math.min(250*2**attempt,3000)+Math.floor(Math.random()*100);
        // Honour Retry-After; a delay beyond our request budget returns the
        // failed response, rather than hanging or retrying before permitted.
        if(delay>=deadline-performance.now())return r;
        await sleep(delay);
      } catch (e) {
        last = { ok: false, status: 0, data: { error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) }, transportCode:transportCodeOf(e) };
        if (mutation || attempt + 1 >= max) break;
        const delay=Math.min(250*2**attempt,3000)+Math.floor(Math.random()*100);
        if(delay>=deadline-performance.now())break;
        await sleep(delay);
      }
    }
    return last ? {...last,...preceding()} : { ok: false, status: 0, data: { error: 'request_failed' },...preceding() }; 
  }

  async testConnection() {
    const startingGeneration=this.balanceAuthorityGeneration;
    const [balanceProof,l] = await Promise.all([
      this.request('GET','/portfolio/balance').then(result=>({result,observedAtMs:Date.now()})),
      this.request('GET','/account/limits'),
    ]);
    const b=balanceProof.result;
    if (!b.ok) {
      // A broker 429 is throttling, not evidence that the API key is invalid.
      // Keep the existing fail-closed LIVE activation gate intact.
      if(b.status===429)throw this.accountReadError('balance',b,'/portfolio/balance');
      if(b.data?.error==='broker_balance_pacing_deadline_exceeded')
        throw this.accountReadError('balance',b,'/portfolio/balance');
      throw this.accountReadError('balance',b,'/portfolio/balance');
    }
    if(this.balanceAuthorityGeneration!==startingGeneration)
      throw this.accountReadError('balance',{ok:false,status:0,notSubmitted:true,
        data:{error:'broker_balance_authority_invalidated'}},'/portfolio/balance');
    return { balance: validateBalance(b.data), limits: l.ok ? l.data : null,
      balanceGeneration:startingGeneration,balanceObservedAtMs:balanceProof.observedAtMs };
  }

  async getBalance({deadline}={}) {
    const r = await this.request('GET', '/portfolio/balance',null,{deadline});
    if (!r.ok) throw this.accountReadError('balance',r,'/portfolio/balance');
    return validateBalance(r.data);
  }

  // A subaccount-restricted key can legitimately omit balance_breakdown.
  // Only an explicitly exchange-index-scoped broker GET proves that shard's
  // available cents; an unscoped account aggregate must never stand in.
  async verifiedExchangeBalanceCents(unscopedBalance, exchangeIndex,{deadline}={}) {
    const idx = finiteExchangeIndex(exchangeIndex);
    if (idx == null) return null;
    if (Array.isArray(unscopedBalance?.balance_breakdown))
      return exchangeBalanceCents(unscopedBalance, idx);
    const result = await this.request('GET', `/portfolio/balance?exchange_index=${idx}`,null,{deadline});
    if (!result?.ok) return null;
    let data;
    try { data = validateBalance(result.data); } catch { return null; }
    const cents = Number(data.balance);
    return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
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

  // A missing position is NOT settlement proof. Retrieve complete authenticated
  // account history for the exact ticker, or fail closed on any missing page.
  async getSettlementsForTicker(ticker, openedAtMs) {
    if(typeof ticker!=='string'||!ticker.trim()||!Number.isSafeInteger(Number(openedAtMs))||Number(openedAtMs)<=0)
      throw new Error('settlement_query_identity_invalid');
    const minTs=Math.max(0,Math.floor(Number(openedAtMs)/1000)-120);
    // Kalshi has no historical settlement-receipt endpoint. Historical
    // positions expose different economics and cannot stand in for this
    // authenticated receipt. An empty result remains unavailable evidence;
    // exact SELL-fill recovery may still use the separate full fill history.
    return this.completePortfolioPages({path:`/portfolio/settlements?ticker=${encodeURIComponent(ticker)}&min_ts=${minTs}&limit=1000`,
      field:'settlements',label:'settlements'});
  }

  // This account-wide ledger is used only to exclude another system's order
  // from a supposedly unique LIVE settlement. Partial pages grant no authority.
  async getFillsForTicker(ticker, openedAtMs) {
    if(typeof ticker!=='string'||!ticker.trim()||!Number.isSafeInteger(Number(openedAtMs))||Number(openedAtMs)<=0)
      throw new Error('settlement_fill_query_identity_invalid');
    const minTs=Math.max(0,Math.floor(Number(openedAtMs)/1000)-120);
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    const query=`ticker=${encodeURIComponent(ticker)}&min_ts=${minTs}&subaccount=0&limit=1000`;
    const live=await this.completePortfolioPages({path:`/portfolio/fills?${query}`,field:'fills',label:'settlement_fills',deadline});
    const archived=await this.completePortfolioPages({path:`/historical/fills?${query}`,field:'fills',label:'settlement_historical_fills',deadline});
    return mergeBrokerHistory(live,archived,{kind:'fills',ticker}).rows;
  }

  async completeOrderHistoryForTicker(ticker,minTsSec=0,{maxPages=20,deadline=performance.now()+OPS_LIMITS.requestBudgetMs}={}){
    if(typeof ticker!=='string'||!ticker.trim())throw Error('broker_historical_ticker_scope_required');
    const minTs=Number.isFinite(Number(minTsSec))?Math.max(0,Math.floor(Number(minTsSec))):0;
    const query=`ticker=${encodeURIComponent(ticker)}&min_ts=${minTs}&subaccount=0&limit=1000`;
    // Live first, then archive: records move only in this direction. Reading
    // both avoids a cached-cutoff race; exact overlaps are checked below.
    const pageStats={pages:0};
    const live=await this.completePortfolioPages({path:`/portfolio/orders?${query}`,field:'orders',label:'orders',maxPages,deadline,pageStats});
    const archived=await this.completePortfolioPages({path:`/historical/orders?${query}`,field:'orders',label:'historical_orders',maxPages,deadline,pageStats});
    return {...mergeBrokerHistory(live,archived,{kind:'orders',ticker}),pages:pageStats.pages};
  }

  // HC1: an incomplete account response is never authoritative broker truth.
  // In particular, repeated cursors previously looped without bound and a
  // missing market_positions array silently looked like an empty account.
  async completePortfolioPages({path,field,label,maxPages=100,deadline=performance.now()+OPS_LIMITS.requestBudgetMs,pageStats=null}={}) {
    const rows=[];
    const seen=new Set();
    let cursor='';
    for(let page=0;page<maxPages;page++){
      if(performance.now()>=deadline)throw new Error(`${label}_collection_deadline`);
      const r=await this.request('GET',`${path}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`,null,{deadline});
      if(!r?.ok)throw this.accountReadError(label,r,path);
      if(!Array.isArray(r.data?.[field]))throw new Error(`${label}_malformed_page`);
      if(r.data[field].length>1000)throw new Error(`${label}_oversized_page`);
      if(pageStats)pageStats.pages=Number(pageStats.pages||0)+1;
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

  async getLiveData(milestoneId,{entryIntent=false}={}) {
    const id = String(milestoneId || '');
    if (!id) return null;
    const r = await this.request(
      'GET',
      `/live_data/milestone/${encodeURIComponent(id)}`,
      null,
      { timeoutMs: 1500, maxAttempts: 2, authenticated: false, preferFallbackHost: true,entryIntent },
    );
    if (!r.ok) throw new Error(`live_data ${r.status}: ${String(r.data?.error || r.data?.message || 'request_failed')}`);
    return r.data?.live_data || r.data || null;
  }

  async getGameStats(milestoneId,{entryIntent=false}={}) {
    const id = String(milestoneId || '');
    if (!id) return null;
    const r = await this.request(
      'GET',
      `/live_data/milestone/${encodeURIComponent(id)}/game_stats`,
      null,
      { timeoutMs: 1500, maxAttempts: 2, authenticated: false, preferFallbackHost: true,entryIntent },
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

  async getMarket(ticker,{deadline,protectiveRead=false}={}) {
    const r = await this.request('GET', `/markets/${encodeURIComponent(ticker)}`,null,{deadline,protectiveRead});
    return r.ok ? parseMarket(r.data.market || r.data) : null;
  }

  async getOrderbook(ticker,{protectiveRead=false}={}) {
    const r = await this.request('GET', `/markets/${encodeURIComponent(ticker)}/orderbook`,null,{protectiveRead});
    if (!r.ok) return null;
    const current=Object.hasOwn(r.data||{},'orderbook_fp');
    const ob=current?r.data.orderbook_fp:r.data?.orderbook;
    if(!ob||typeof ob!=='object'||Array.isArray(ob))return null;
    const readSide=side=>{
      const dollars=Object.hasOwn(ob,`${side}_dollars`);
      if(current&&!dollars)return null;
      const levels=dollars?ob[`${side}_dollars`]:ob[side];
      if(!Array.isArray(levels))return null;
      const out=[],seen=new Set();
      for(const level of levels){
        if(!Array.isArray(level)||level.length!==2||!brokerDecimal(level[0])||!brokerDecimal(level[1]))return null;
        const priceCents=marketCents(dollars?level[0]:null,dollars?null:level[0]);
        const count=Number(level[1]);
        if(!(priceCents>0&&priceCents<100)||!Number.isSafeInteger(Math.round(count*100))
          ||Math.abs(count*100-Math.round(count*100))>1e-7||seen.has(priceCents))return null;
        seen.add(priceCents);
        if(count>0)out.push({priceCents,count});
      }
      return out.sort((a,b)=>b.priceCents-a.priceCents);
    };
    const yesBids=readSide('yes'),noBids=readSide('no');
    if(!yesBids||!noBids)return null;
    return { ticker, yesBids, noBids, updatedAtMs: Date.now() };
  }

  clientOrderPrefix(ownerId, tradeId, phase) {
    if(!this.cloneIdentity?.id)throw new Error('clone_identity_required_for_live_order');
    return cloneClientOrderPrefix(this.cloneIdentity.id,ownerId,tradeId,phase);
  }
  // Historical, pre-clone IDs remain stored exactly as originally submitted.
  // A legacy owner-only prefix cannot prove ownership across cloned systems;
  // never issue a new ID or adopt unknown history using that weak prefix.
  legacyClientOrderPrefix(ownerId,tradeId,phase){
    const clean=(v,n)=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,n);
    return `sag-${clean(ownerId,18)}-${clean(tradeId,10)}-${clean(phase,18)}-`;
  }
  buildClientOrderId(ownerId, tradeId, phase) {
    return `${this.clientOrderPrefix(ownerId, tradeId, phase)}${randomUUID().slice(0, 8)}`;
  }
  // Existing pre-clone orders are NEVER rewritten. A historical exit
  // prefix is allowed only when the local durable entry already has an exact
  // authoritative BUY order/fill proof and a legacy original client ID.
  // A mere ticker match or owner prefix is never sufficient.
  exitHistoryPrefixForEntry(entry){
    const modern=this.clientOrderPrefix(entry?.ownerId,entry?.id,'exit');
    const oldBuy=this.legacyClientOrderPrefix(entry?.ownerId,entry?.id,'entry');
    const p=entry?.entryConfig?.entryFillProof;
    if(typeof entry?.entryClientOrderId==='string'&&entry.entryClientOrderId.startsWith(oldBuy)
      &&p?.authoritative===true&&String(p.orderId)===String(entry.entryOrderId)
      &&String(p.clientOrderId)===String(entry.entryClientOrderId))
      return this.legacyClientOrderPrefix(entry.ownerId,entry.id,'exit');
    return modern;
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
    // Missing route / explicit -1 retains the broker's documented auto-route.
    // Any PROVIDED malformed shard must fail rather than silently become -1.
    const exchangeRoute=(exchangeIndex==null||exchangeIndex===-1||exchangeIndex==='-1')?-1:finiteExchangeIndex(exchangeIndex);
    if(exchangeRoute==null)throw new Error('invalid_order_exchange_index');
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
      exchange_index: exchangeRoute,
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
  async fillTruth(orderId, expectedTicker = null, expectedBookSide = null, expectedExchangeIndex = null,
    {historical=false,minTsSec=0,deadline=performance.now()+OPS_LIMITS.requestBudgetMs}={}) {
    const incomplete=(reason,brokerEvidence=null)=>({authoritative:false,reason,brokerEvidence,count:null,
      averageFillPriceCents:null,feeCostCents:null});
    if(!orderId)return incomplete('missing_order_id');
    const stats={pages:0};let rows;
    try{
      const live=await this.completePortfolioPages({path:`/portfolio/fills?order_id=${encodeURIComponent(orderId)}&limit=1000`,
        field:'fills',label:'fill_history',maxPages:200,deadline,pageStats:stats});
      if(live.some(f=>String(f?.order_id||'')!==String(orderId)))return incomplete('fill_history_wrong_or_missing_order');
      rows=live;
      if(historical){
        if(typeof expectedTicker!=='string'||!expectedTicker.trim())return incomplete('fill_history_historical_ticker_scope_required');
        const minTs=Number.isFinite(Number(minTsSec))?Math.max(0,Math.floor(Number(minTsSec))):0;
        // Historical fills have no order_id query parameter. Scope the bounded
        // scan to this exact market and verify identity before selecting this
        // order; never use an all-account archive scan or invented FIFO owner.
        const archived=await this.completePortfolioPages({
          path:`/historical/fills?ticker=${encodeURIComponent(expectedTicker)}&min_ts=${minTs}&subaccount=0&limit=1000`,
          field:'fills',label:'historical_fill_history',maxPages:20,deadline,pageStats:stats});
        if(archived.some(f=>String(f?.ticker??f?.market_ticker??'')!==expectedTicker
          ||typeof f?.order_id!=='string'||!f.order_id.trim()))return incomplete('fill_history_historical_identity_invalid');
        rows=mergeBrokerHistory(live,archived.filter(f=>f.order_id===String(orderId)),{kind:'fills',ticker:expectedTicker}).rows;
      }
    }catch(error){return incomplete(String(error?.message||'fill_history_request_failed'));}
    const seenFillIds=new Set();let count=0,notional=0,feeCostCents=0,feeComplete=true;
    for(const f of rows){
      if(f?.order_id==null||String(f.order_id)!==String(orderId))return incomplete('fill_history_wrong_or_missing_order');
      if(expectedTicker!=null&&String(f?.ticker??f?.market_ticker??'')!==String(expectedTicker))
        return incomplete('fill_history_wrong_or_missing_ticker');
      const fillId=f?.fill_id??f?.id;
      if(typeof fillId!=='string'||!fillId.trim())return incomplete('fill_history_missing_fill_id');
      if(seenFillIds.has(fillId))return incomplete('fill_history_duplicate_fill_id');
      seenFillIds.add(fillId);
      const directionError=brokerDirectionError(f,expectedBookSide);
      if(directionError)return incomplete(`fill_history_${directionError}`,brokerDirectionEvidence(f,expectedBookSide,'order_fill_history'));
      if(expectedExchangeIndex!=null&&finiteExchangeIndex(f.exchange_index)!==expectedExchangeIndex)
        return incomplete('fill_history_exchange_index_mismatch');
      for(const key of ['subaccount_number','subaccount'])
        if(f[key]!=null&&finiteExchangeIndex(f[key])!==0)return incomplete('fill_history_subaccount_mismatch');
      const rawCount=f.count_fp??f.count,c=Number(rawCount);
      if(!brokerDecimal(rawCount)||c<=0)return incomplete('fill_history_invalid_quantity');
      const isDollars=f.yes_price_dollars!=null||f.price_dollars!=null;
      const rawPrice=isDollars?(f.yes_price_dollars??f.price_dollars):(f.yes_price??f.price);
      if(!brokerDecimal(rawPrice))return incomplete('fill_history_invalid_price');
      const px=Number(rawPrice)*(isDollars?100:1);
      if(!Number.isFinite(px)||px<=0||px>100)return incomplete('fill_history_invalid_price');
      count+=c;notional+=c*px;
      if(f.fee_cost==null)feeComplete=false;
      else{if(!brokerDecimal(f.fee_cost))return incomplete('fill_history_invalid_fee');feeCostCents+=Number(f.fee_cost)*100;}
    }
    if(!Number.isFinite(count)||!Number.isFinite(notional)||!Number.isFinite(feeCostCents))return incomplete('fill_history_totals_invalid');
    return {authoritative:true,reason:null,count,averageFillPriceCents:count>0?notional/count:null,
      feeCostCents:feeComplete?feeCostCents:null,notionalCents:notional,pages:stats.pages,
      historySource:historical?'live_and_historical':'live'};
  }

  // Order summaries and the complete fill ledger must agree before any
  // terminal/no-fill decision or cumulative position delta is accepted.
  async verifiedOrder(raw, clientOrderId, expectedBookSide = null,
    {historical=false,deadline=performance.now()+OPS_LIMITS.requestBudgetMs}={}) {
    const invalid=brokerReceiptError(raw,{clientOrderId})||brokerDirectionError(raw,expectedBookSide);
    if(invalid)return {found:true,authoritative:false,order:null,reason:invalid,
      brokerEvidence:brokerDirectionEvidence(raw,expectedBookSide,'order_receipt')};
    const order = this.resultFrom(raw, clientOrderId);
    const reportedStatus=raw?.status;
    if(reportedStatus!=null&&!BROKER_TERMINAL.has(String(reportedStatus))&&!BROKER_ACTIVE.has(String(reportedStatus)))
      return {found:true,authoritative:false,order:null,reason:'broker_order_status_unknown'};
    // Cancelled/expired orders may report the unfilled remainder even though
    // they are terminal. Exact full fill-history inspection, not remainder=0,
    // establishes the executed quantity. Executed/filled orders must still
    // have no unfilled remainder.
    if(['executed','filled'].includes(String(reportedStatus))&&order.remainingCount>0)
      return {found:true,authoritative:false,order:null,reason:'broker_terminal_remaining_conflict'};
    if (!order.orderId) return { found:true, authoritative:false, order:null, reason:'broker_order_id_missing' };
    const opened=Date.parse(String(raw?.created_time||''));
    const historyOptions={historical,minTsSec:Number.isFinite(opened)?Math.max(0,Math.floor(opened/1000)-120):0,deadline};
    let fills=await this.fillTruth(order.orderId,raw?.ticker??raw?.market_ticker??null,expectedBookSide,order.exchangeIndex,historyOptions);
    // A still-live order can have older fills already moved to the archive.
    // Missing current quantity is not a zero-fill result or permission to
    // replace the original order; combine both tiers and recheck all totals.
    if(!historical&&fills?.authoritative&&fills.count+1e-7<Number(order.fillCount))
      fills=await this.fillTruth(order.orderId,raw?.ticker??raw?.market_ticker??null,expectedBookSide,order.exchangeIndex,
        {...historyOptions,historical:true});
    if (!fills?.authoritative) return { found:true, authoritative:false, order:null, reason:fills?.reason || 'fill_history_unavailable',brokerEvidence:fills?.brokerEvidence||null };
    // A terminal execution receipt with no verified fills is contradictory.
    // Do not release a durable entry intent as an IOC no-fill on such evidence.
    if (['executed','filled'].includes(String(reportedStatus||'')) && fills.count <= 0)
      return { found:true, authoritative:false, order:null, reason:'broker_executed_without_verified_fills' };
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
    order.historySource=fills.historySource;
    return { found:true, authoritative:true, order };
  }

  async inspectOrderById(orderId, clientOrderId = null, expectedTicker = null, expectedBookSide = null) {
    const unavailable=reason=>({found:false,authoritative:false,order:null,reason});
    if(!orderId)return unavailable('missing_order_id');
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    let r,raw,historical=false;
    try{r=await this.request('GET',`/portfolio/orders/${encodeURIComponent(orderId)}`,null,{deadline});}
    catch{return unavailable('broker_order_request_failed');}
    if(r?.ok){
      if(!r.data?.order)return unavailable('broker_order_response_invalid');
      raw=r.data.order;
    }else{
      // An archived order has no individual GET route. A 404 permits only an
      // exact-market bounded history lookup; an outage never proves absence.
      if(Number(r?.status)!==404)return unavailable('broker_order_request_failed');
      try{
        const history=await this.completeOrderHistoryForTicker(expectedTicker,0,{deadline});
        raw=history.rows.find(x=>x.order_id===String(orderId));
        if(!raw)return {found:false,authoritative:true,order:null,reason:'broker_order_absent_in_complete_history',historySource:'live_and_historical'};
        historical=history.historicalOnly.has(String(orderId));
      }catch(error){return unavailable(String(error?.message||'broker_order_history_unavailable'));}
    }
    if(clientOrderId&&String(raw.client_order_id||'')!==String(clientOrderId))
      return {found:true,authoritative:false,order:null,mismatch:true,reason:'broker_order_client_id_mismatch'};
    if(String(raw.order_id||'')!==String(orderId))
      return {found:true,authoritative:false,order:null,mismatch:true,reason:'broker_order_id_mismatch'};
    if(expectedTicker&&String(raw.ticker??raw.market_ticker??'')!==String(expectedTicker))
      return {found:true,authoritative:false,order:null,mismatch:true,reason:'broker_order_ticker_mismatch'};
    return this.verifiedOrder(raw,raw.client_order_id||clientOrderId,expectedBookSide,{historical,deadline});
  }

  // Live and historical tiers form one bounded identity search. An empty
  // current tier alone cannot prove absence after the broker archives orders.
  async inspectOrderByClientId(ticker, clientOrderId, minTsSec, attempts = 6, expectedBookSide = null) {
    if(typeof clientOrderId!=='string'||!clientOrderId.trim())
      return {found:false,authoritative:false,order:null,reason:'broker_client_order_id_missing'};
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    const tries=Math.max(1,Math.min(6,Math.floor(Number(attempts)||1)));
    let reason='broker_order_history_unavailable';
    for(let i=0;i<tries;i++){
      try{
        const history=await this.completeOrderHistoryForTicker(ticker,minTsSec,{deadline});
        const matches=history.rows.filter(x=>x.client_order_id===clientOrderId);
        if(matches.length>1)return {found:true,authoritative:false,order:null,mismatch:true,reason:'broker_duplicate_client_order_identity'};
        if(matches.length===1)return this.verifiedOrder(matches[0],clientOrderId,expectedBookSide,
          {historical:history.historicalOnly.has(matches[0].order_id),deadline});
        return {found:false,authoritative:true,order:null,historySource:'live_and_historical'};
      }catch(error){reason=String(error?.message||reason);}
      const delay=500+i*250;
      if(i+1>=tries||performance.now()+delay>=deadline)break;
      await sleep(delay);
    }
    return {found:false,authoritative:false,order:null,reason};
  }

  async inspectOrderHistoryByClientPrefix(ticker, clientOrderPrefix, minTsSec, { maxPages = 12 } = {}) {
    const empty=reason=>({found:false,authoritative:false,orders:[],fillCount:0,notionalCents:0,
      feePaidCents:0,averageFillPriceCents:null,reason});
    const prefix=String(clientOrderPrefix||'');
    if(!ticker||!prefix)return empty('broker_order_history_scope_required');
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    let history;
    try{history=await this.completeOrderHistoryForTicker(ticker,minTsSec,
      {maxPages:Math.max(1,Math.min(20,Math.floor(Number(maxPages)||1))),deadline});}
    catch(error){return empty(String(error?.message||'broker_order_history_unavailable'));}
    const matched=[],seenClients=new Set();
    for(const raw of history.rows){
      const cid=String(raw?.client_order_id||'');
      if(!cid.startsWith(prefix))continue;
      // A retry must use its own immutable client ID. Two distinct broker
      // order IDs for that one ID are ambiguous, including across tiers.
      if(seenClients.has(cid))return empty('broker_duplicate_client_order_identity');
      seenClients.add(cid);
      const verified=await this.verifiedOrder(raw,cid,'ask',
        {historical:history.historicalOnly.has(raw.order_id),deadline});
      if(!verified.authoritative)return empty(verified.reason||'broker_order_history_fill_unverified');
      matched.push(verified.order);
    }
    let fillCount=0,notionalCents=0,feePaidCents=0;
    for(const order of matched){
      if(order.fillCount<=0)continue;
      fillCount+=order.fillCount;
      notionalCents+=order.fillCount*order.averageFillPriceCents;
      feePaidCents+=order.feePaidCents;
    }
    if(!Number.isFinite(fillCount)||!Number.isFinite(notionalCents)||!Number.isFinite(feePaidCents))
      return empty('broker_order_history_totals_invalid');
    return {found:matched.length>0,authoritative:true,orders:matched,fillCount,notionalCents,feePaidCents,
      averageFillPriceCents:fillCount>0?notionalCents/fillCount:null,pages:history.pages,historySource:'live_and_historical'};
  }

  async findOrderByClientId(ticker, clientOrderId, minTsSec, attempts = 6, expectedBookSide = null) {
    const inspected = await this.inspectOrderByClientId(ticker, clientOrderId, minTsSec, attempts, expectedBookSide);
    return inspected.order;
  }

  async preflightExchangeBalance({ ticker, exchangeIndex = null, requiredCents = 0 } = {}) {
    // Missing, negative, or invalid collateral cannot become a zero-cost BUY.
    if (!Number.isFinite(Number(requiredCents)) || !(Number(requiredCents) > 0)
      || typeof requiredCents === 'boolean' || requiredCents == null || String(requiredCents).trim() === '')
      return { ok:false, reason:'live_exchange_collateral_requirement_invalid', exchangeIndex:null,
        availableCents:null, requiredCents:null };
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
    const availableCents = await this.verifiedExchangeBalanceCents(balance, idx);
    const need = Math.max(0, Number(requiredCents) || 0);
    if (availableCents == null) return { ok:false, reason:'live_exchange_balance_unavailable', exchangeIndex:idx, availableCents:null, requiredCents:need };
    if (availableCents + 1e-9 < need) return { ok:false, reason:'live_exchange_insufficient_balance', exchangeIndex:idx, availableCents, requiredCents:need };
    return { ok:true, reason:'live_exchange_balance_ready', exchangeIndex:idx, availableCents, requiredCents:need };
  }

  async transferExchangeShardBalance({ sourceExchangeIndex, destinationExchangeIndex, amountCents, sourceSubaccount = 0,
    destinationSubaccount = 0, clientTransferId = null,deadline } = {}) {
    const source = finiteExchangeIndex(sourceExchangeIndex);
    const destination = finiteExchangeIndex(destinationExchangeIndex);
    const srcAccount=finiteExchangeIndex(sourceSubaccount);
    const dstAccount=finiteExchangeIndex(destinationSubaccount);
    // A malformed direct funding call must never emit JSON with null/NaN
    // amounts or silently truncate a subaccount identity to another account.
    const cents = brokerDecimal(amountCents) ? Number(amountCents) : null;
    const amountCenticents = cents == null ? null : Math.ceil(cents * 100 - 1e-9);
    if (source == null || destination == null || source>100 || destination>100 || source === destination
      || srcAccount == null || dstAccount == null || srcAccount > 63 || dstAccount > 63
      || !Number.isSafeInteger(amountCenticents) || amountCenticents <= 0
      || (clientTransferId!=null&&(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientTransferId)
        ||srcAccount!==0||dstAccount!==0))) {
      return { ok:false, reason:'live_exchange_rebalance_invalid_request', sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:cents };
    }
    // This broker-supported ID makes each primary-account funding mutation
    // identifiable and protects against accidental duplicate submissions.
    // It is not a login token, and it is never used as order authority.
    clientTransferId??=randomUUID();
    const payload = {
      source:'event_contract',
      destination:'event_contract',
      amount:amountCenticents,
      ...(srcAccount===0&&dstAccount===0
        ?{client_transfer_id:clientTransferId}:{}),
      source_exchange_shard:source,
      destination_exchange_shard:destination,
      source_subaccount:srcAccount,
      destination_subaccount:dstAccount,
    };
    let r;
    try {
      r = await this.request('POST', '/portfolio/intra_exchange_instance_transfer', payload, { mutation:true, timeoutMs:12000,deadline });
    } catch (error) {
      return { ok:false, ambiguous:true, reason:'live_exchange_rebalance_ambiguous',clientTransferId,
        sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:amountCenticents/100,
        message:String(error?.message||error) };
    }
    if (!r?.ok) {
      const err = brokerErrorFields(r?.data || {});
      const status=Number(r?.status||0);
      const ambiguous=r?.notSubmitted!==true&&(status===0||status===408||status===409||status===425||status===429||status>=500);
      return { ok:false, reason:ambiguous?'live_exchange_rebalance_ambiguous':'live_exchange_rebalance_failed', ambiguous,
        notSubmitted:r?.notSubmitted===true,clientTransferId,sourceExchangeIndex:source,
        destinationExchangeIndex:destination,amountCents:amountCenticents/100,httpStatus:status,...err };
    }
    const transferId=r.data?.transfer_id;
    if(typeof transferId!=='string'||!transferId.trim())
      return {ok:false,ambiguous:true,reason:'live_exchange_rebalance_receipt_unverified',
        clientTransferId,sourceExchangeIndex:source,destinationExchangeIndex:destination,
        amountCents:amountCenticents/100};
    return { ok:true, reason:'live_exchange_rebalance_accepted', transferId, clientTransferId, sourceExchangeIndex:source, destinationExchangeIndex:destination, amountCents:amountCenticents/100 };
  }

  // Pending transfers are reconciled by their exact durable identity. A fresh
  // balance can prove spending power, but can never prove an old transfer did
  // not execute or justify submitting another transfer with a new client ID.
  async inspectExchangeFundingTransfer(record,{history=null,deadline=performance.now()+OPS_LIMITS.requestBudgetMs}={}) {
    const invalid=reason=>({authoritative:false,found:false,reason});
    const verify=raw=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw)
        ||typeof raw.transfer_id!=='string'||!raw.transfer_id.trim()
        ||(record.transferId&&raw.transfer_id!==record.transferId)
        ||(raw.client_transfer_id!=null&&raw.client_transfer_id!==record.clientTransferId)
        ||(!record.transferId&&raw.client_transfer_id!==record.clientTransferId)
        ||raw.source!=='event_contract'||raw.destination!=='event_contract'
        ||finiteExchangeIndex(raw.source_exchange_shard)!==record.sourceExchangeIndex
        ||finiteExchangeIndex(raw.destination_exchange_shard)!==record.destinationExchangeIndex
        ||!brokerDecimal(raw.amount)
        ||Math.abs(Number(raw.amount)*10000-record.amountCenticents)>1e-6
        ||!['pending','complete'].includes(raw.status)
        ||!Number.isSafeInteger(raw.created_ts)||raw.created_ts<=0
        ||raw.created_ts*1000<record.createdAtMs-120000||raw.created_ts*1000>Date.now()+30000)
        return invalid('live_exchange_transfer_receipt_mismatch');
      return {authoritative:true,found:true,complete:raw.status==='complete',transferId:raw.transfer_id,
        receipt:{transferId:raw.transfer_id,clientTransferId:record.clientTransferId,
          sourceExchangeIndex:record.sourceExchangeIndex,destinationExchangeIndex:record.destinationExchangeIndex,
          amountCenticents:record.amountCenticents,status:raw.status,createdAtMs:raw.created_ts*1000}};
    };
    if(record.transferId){
      const r=await this.request('GET',`/portfolio/intra_exchange_instance_transfers/${encodeURIComponent(record.transferId)}`,null,{deadline});
      if(r?.ok)return verify(r.data?.transfer);
      if(r?.status!==404)return invalid('live_exchange_transfer_receipt_unavailable');
    }
    let rows;
    try{rows=history?await history():await this.completePortfolioPages({
      path:'/portfolio/intra_exchange_instance_transfers?limit=500',field:'transfers',label:'funding_transfers',maxPages:20,deadline});}
    catch{return invalid('live_exchange_transfer_history_incomplete');}
    if(!Array.isArray(rows))return invalid('live_exchange_transfer_history_invalid');
    const matching=rows.filter(r=>r?.client_transfer_id===record.clientTransferId
      ||record.transferId&&r?.transfer_id===record.transferId);
    if(matching.length>1)return invalid('live_exchange_transfer_identity_duplicated');
    if(matching.length===1)return verify(matching[0]);
    return {authoritative:true,found:false,reason:'live_exchange_transfer_not_visible'};
  }

  // R9: coalesce only *simultaneous same-shard* funding preflights.
  // Sharing one authenticated READY balance snapshot is not order permission:
  // each candidate still takes the durable per-owner pending-cash admission
  // and the independent pre-send executable cash/book checks.
  // A failed/ambiguous transfer is NEVER turned into a ready balance.
  async ensureExchangeBalance(options={}) {
    const idx=finiteExchangeIndex(options?.exchangeIndex);
    if(idx==null)return this._ensureExchangeBalanceCore(options);
    const flights=this.q17ExchangeBalanceFlights??=new Map();
    const active=flights.get(idx);
    if(active){
      const result=await active;
      const required=Number(options?.requiredCents);
      // A larger first candidate can fail for insufficient total cash while
      // a smaller concurrent candidate is still fundable on this exact shard.
      // Only no-transfer, authenticated balance outcomes qualify; any pending
      // or ambiguous transfer remains a denial for all shared callers.
      const verifiedNoTransfer=result?.ok===true
        ||['live_account_insufficient_balance','live_exchange_donor_breakdown_unavailable']
          .includes(String(result?.reason||''));
      if(verifiedNoTransfer&&brokerDecimal(required)&&required>0
        &&brokerDecimal(result.availableCents)
        &&Number(result.availableCents)+1e-9>=required)
        return {...result,ok:true,requiredCents:required,
          reason:'live_exchange_verified_shared_preflight',sameShardSharedPreflight:true};
      // No unverified shared balance or pending transfer can authorize entry.
      // Ask the next entry phase to retry rather than sending a second transfer.
      return {ok:false,reason:result?.ok===true?'live_exchange_shared_cash_insufficient':
        String(result?.reason||'live_exchange_shared_preflight_incomplete'),
        exchangeIndex:idx,availableCents:result?.availableCents??null,
        requiredCents:required,retryable:true};
    }
    const task=Promise.resolve().then(()=>this._ensureExchangeBalanceCore(options));
    flights.set(idx,task);
    try{return await task;}
    finally{if(flights.get(idx)===task)flights.delete(idx);}
  }

  async _ensureExchangeBalanceCore({ ticker, exchangeIndex = null, requiredCents = 0 } = {}) {
    if(!brokerDecimal(requiredCents)||!(Number(requiredCents)>0))
      return {ok:false,reason:'live_exchange_collateral_requirement_invalid',exchangeIndex:null,availableCents:null,requiredCents:null};
    const deadline=performance.now()+OPS_LIMITS.requestBudgetMs;
    let idx=finiteExchangeIndex(exchangeIndex);
    if(idx==null&&ticker){const market=await this.getMarket(ticker,{deadline}).catch(()=>null);idx=finiteExchangeIndex(market?.exchangeIndex);}
    const need=Number(requiredCents);
    if(idx==null||idx>100)return {ok:false,reason:'live_exchange_index_unavailable',exchangeIndex:idx,availableCents:null,requiredCents:need};
    const refusal=(reason,extra={})=>({ok:false,reason,exchangeIndex:idx,availableCents:null,requiredCents:need,...extra});
    if(this.exchangeBalanceChecks.has(idx))return refusal('live_exchange_balance_check_in_progress',{retryable:true});
    this.exchangeBalanceChecks.add(idx);
    try{
      const store=typeof this.fundingStore==='function'?this.fundingStore():this.fundingStore;
      if(!store||typeof store.withLock!=='function'){
        // A read-only ready result is safe without journal access. Every new
        // automatic funding mutation, however, requires durable intent first.
        const ready=await this.preflightExchangeBalance({ticker,exchangeIndex:idx,requiredCents:need});
        return ready.ok?{...ready,rebalanced:false}:refusal('live_exchange_funding_store_unavailable');
      }
      return await store.withLock(async journal=>{
        if(!journal||['listPending','prepare','update'].some(k=>typeof journal[k]!=='function'))
          return refusal('live_exchange_funding_store_unavailable');
        let pending=await journal.listPending();
        if(!Array.isArray(pending)||pending.length>100)return refusal('live_exchange_funding_backlog_unverified');
        let historyPromise=null;
        const history=()=>historyPromise??=(this.completePortfolioPages({
          path:'/portfolio/intra_exchange_instance_transfers?limit=500',field:'transfers',label:'funding_transfers',maxPages:20,deadline}));
        // Bound HTTP work while preserving progress when a receipt stays
        // unresolved: inspect the oldest checked records first, and retain
        // every unvisited intent as a busy source AND destination shard.
        const inspect=pending.slice().sort((a,b)=>a.updatedAtMs-b.updatedAtMs).slice(0,4);
        const inspectedIds=new Set(inspect.map(r=>r.clientTransferId));
        const remaining=pending.filter(r=>!inspectedIds.has(r.clientTransferId));
        for(const record of inspect){
          if(performance.now()>=deadline)return refusal('live_exchange_funding_reconciliation_deadline',{retryable:true});
          const truth=await this.inspectExchangeFundingTransfer(record,{history,deadline});
          if(truth.authoritative&&truth.found){
            const saved=await journal.update(record.clientTransferId,{state:truth.complete?'complete':'submitted',
              transferId:truth.transferId,receipt:truth.receipt});
            if(!truth.complete)remaining.push(saved);
            else this.exchangeFundingInFlight.delete(record.destinationExchangeIndex);
            continue;
          }
          // If a worker died after the durable write, the POST may or may not
          // have reached Kalshi. An authoritative empty history still is not
          // proof of non-submission. Reuse ONLY the exact primary-account ID
          // and amount; Kalshi duplicate prevention makes this retry safe.
          const canReplay=truth.authoritative&&!truth.found&&!record.transferId
            &&record.sourceSubaccount===0&&record.destinationSubaccount===0
            &&Date.now()-Number(record.receipt?.lastReplayAtMs??record.createdAtMs)>=5000;
          if(canReplay){
            const moved=await this.transferExchangeShardBalance({sourceExchangeIndex:record.sourceExchangeIndex,
              destinationExchangeIndex:record.destinationExchangeIndex,amountCents:record.amountCenticents/100,
              clientTransferId:record.clientTransferId,deadline});
            const saved=await journal.update(record.clientTransferId,{state:moved.ok?'submitted':'ambiguous',
              ...(moved.transferId?{transferId:moved.transferId}:{}),
              receipt:{reason:moved.reason,httpStatus:moved.httpStatus??null,reusedOriginalClientId:true,lastReplayAtMs:Date.now()}});
            remaining.push(saved);
          }else remaining.push(await journal.update(record.clientTransferId,{state:record.state,
            receipt:{...record.receipt,lastInspectionReason:truth.reason,inspectedAtMs:Date.now()}}));
        }
        pending=remaining;
        const busyShards=new Set(pending.flatMap(r=>[r.sourceExchangeIndex,r.destinationExchangeIndex]));
        if(busyShards.has(idx))return refusal('live_exchange_rebalance_pending',{retryable:true,
          transferIds:pending.filter(r=>r.destinationExchangeIndex===idx||r.sourceExchangeIndex===idx)
            .map(r=>r.transferId).filter(Boolean),ambiguous:pending.some(r=>r.state!=='submitted')});
        let balance;
        try{balance=await this.getBalance({deadline});}catch{return refusal('live_exchange_balance_unavailable');}
        const availableCents=await this.verifiedExchangeBalanceCents(balance,idx,{deadline});
        if(availableCents==null)return refusal('live_exchange_balance_unavailable');
        if(availableCents+1e-9>=need)return {ok:true,reason:'live_exchange_balance_ready',
          exchangeIndex:idx,availableCents,requiredCents:need,rebalanced:false};
        const rows=balance?.balance_breakdown;
        if(!Array.isArray(rows)||!rows.length)return refusal('live_exchange_donor_breakdown_unavailable',{availableCents});
        const donors=[],seen=new Set();
        for(const row of rows){
          const source=finiteExchangeIndex(row?.exchange_index),amount=brokerDecimal(row?.balance)?Number(row.balance)*100:null;
          if(source==null||source>100||seen.has(source)||amount==null||!Number.isFinite(amount))
            return refusal('live_exchange_balance_breakdown_invalid',{availableCents});
          seen.add(source);
          if(source!==idx&&amount>0&&!busyShards.has(source))donors.push({exchangeIndex:source,availableCents:amount});
        }
        donors.sort((a,b)=>b.availableCents-a.availableCents);
        const shortage=need-availableCents,transferableCents=donors.reduce((sum,r)=>sum+r.availableCents,0);
        if(transferableCents+1e-9<shortage)return refusal(pending.length?'live_exchange_rebalance_source_pending':'live_account_insufficient_balance',
          {availableCents,transferableCents,retryable:pending.length>0});
        const donor=donors[0],amountCenticents=Math.ceil(Math.min(shortage,donor.availableCents)*100-1e-9);
        const intent=await journal.prepare({clientTransferId:randomUUID(),sourceExchangeIndex:donor.exchangeIndex,
          destinationExchangeIndex:idx,sourceSubaccount:0,destinationSubaccount:0,amountCenticents,state:'prepared'});
        if(!intent||intent.state!=='prepared'||intent.sourceExchangeIndex!==donor.exchangeIndex
          ||intent.destinationExchangeIndex!==idx||intent.amountCenticents!==amountCenticents)
          return refusal('live_exchange_funding_intent_unverified');
        this.exchangeFundingInFlight.set(idx,intent);
        const moved=await this.transferExchangeShardBalance({sourceExchangeIndex:intent.sourceExchangeIndex,
          destinationExchangeIndex:intent.destinationExchangeIndex,amountCents:intent.amountCenticents/100,
          clientTransferId:intent.clientTransferId,deadline});
        await journal.update(intent.clientTransferId,{state:moved.ok?'submitted':moved.ambiguous?'ambiguous':'failed',
          ...(moved.transferId?{transferId:moved.transferId}:{}),
          receipt:{reason:moved.reason,httpStatus:moved.httpStatus??null,notSubmitted:moved.notSubmitted===true}});
        if(!moved.ok&&!moved.ambiguous)this.exchangeFundingInFlight.delete(idx);
        return {...moved,ok:false,reason:moved.ok?'live_exchange_rebalance_requested':moved.reason,
          retryable:moved.ok||moved.ambiguous===true,exchangeIndex:idx,availableCents,requiredCents:need,
          fundingRequestedCents:intent.amountCenticents/100,transferIds:moved.transferId?[moved.transferId]:[]};
      });
    }catch(error){
      return refusal(error?.code==='live_funding_lock_busy'?'live_exchange_balance_check_in_progress':'live_exchange_funding_journal_unavailable',
        {retryable:true,message:String(error?.message||error).slice(0,160)});
    }finally{this.exchangeBalanceChecks.delete(idx);}
  }

  async placeOrder(args,{beforeDispatch=null,confirmDispatch=null}={}) {
    // Deployment policy, order provenance, durable claim and final dispatch
    // controls are enforced by the enclosing runtime before transport.
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
      const truth = await this.findOrderByClientId(args.ticker, args.clientOrderId, minTs, 6,
        args.action==='buy'?'bid':'ask').catch(()=>null);
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
