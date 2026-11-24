import {ClockPriority,inheritClockPriority,joinClockWork} from './clockPriority.mjs';
// R33: Kalshi GET /markets can omit series_ticker even when an exact
// event_ticker is present. This strict decomposition of the event identity
// is ONLY a discovery/enrichment key, never official sporting-time proof,
// never a market rewrite and never an order/account permission.
export function researchSeriesForMarket(q){
  const explicit=String(q?.seriesTicker||'').trim();
  if(explicit)return explicit;
  const event=String(q?.eventTicker||'').trim().toUpperCase();
  const match=/^(KX[A-Z0-9]{3,48})-[A-Z0-9][A-Z0-9-]*$/.exec(event);
  return match&&/(GAME|MATCH)/.test(match[1])?match[1]:'';
}


export const GAME_CLOCK_AUTHORITY = Object.freeze({
  version: 'GCA2-R5',
  legacyVersions: Object.freeze(['GCA1','GCA2','GCA2-R4']),
  milestoneCacheMs: 30 * 60 * 1000,
  ambiguousMilestoneCacheMs: 30 * 1000,
  missingMilestoneCacheMs: 5 * 60 * 1000,
  seriesMilestoneCacheMs: 60 * 1000,
  milestoneForceRefreshMinIntervalMs: 30 * 1000,
  milestoneFailureBackoffMs: 30 * 1000,
  policyRevision: 'GCA2-R5-R38-DURABLE-PROOF-FRESH-ENTRY-CAUSAL-EVIDENCE',
  scheduleReferenceMaximumAgeMs: 6 * 60 * 60 * 1000,
  boundedStartMaximumSpanMs: 12 * 60 * 1000,
  boundedProviderRequestMaximumMs: 2500,
  observedActivityMaxGapMs: 10 * 60 * 1000,
  observedActivityMinimumObservations: 2,
  liveDataCacheMs: 20 * 1000,
  gameStatsCacheMs: 30 * 1000,
  entryAuthorizationMaxAgeMs: 10 * 1000,
  maxConcurrency: 12,
  maximumCacheEntries: 2048,
});

const POSITIVE_STATUS = new Set([
  'live', 'inprogress', 'inplay', 'started', 'ongoing', 'playing',
  'halftime', 'intermission', 'overtime', 'extratime',
]);
const NEGATIVE_STATUS = new Set([
  'scheduled', 'pregame', 'prestart', 'notstarted', 'upcoming',
  'delayed', 'postponed', 'pending', 'warmup', 'paused', 'suspended',
]);
// Only unambiguously pre-kickoff statuses may serve as the lower bound.
// 'paused', 'suspended', 'intermission' and 'delayed' are not proof that
// sporting play has NEVER commenced, even when classified non-live.
const PRESTART_BOUND_STATUS = new Set([
  'scheduled','pregame','prestart','notstarted','upcoming','warmup',
]);
const FINAL_STATUS = new Set([
  'final', 'finished', 'complete', 'completed', 'ended', 'settled',
  'canceled', 'cancelled', 'abandoned', 'closed',
]);
const STATUS_KEYS = new Set([
  'status', 'state', 'phase', 'livestatus', 'gamestatus', 'matchstatus',
  'eventstatus', 'fixturestatus', 'gamestate', 'matchstate', 'eventstate',
]);
const LIVE_BOOLEAN_KEYS = new Set([
  'islive', 'inprogress', 'started', 'hasstarted', 'isstarted',
]);
// Flexible live-data JSON is intentionally constrained. Period/clock/player/team
// subtrees are NOT authoritative for whole-game lifecycle because a completed
// period or a live player state must never finalize/start the entire event.
const SAFE_CONTAINER_KEYS = new Set([
  'game', 'match', 'event', 'fixture', 'scoreboard', 'details',
]);

const TERMINAL_MARKET_STATUSES = new Set([
  'closed', 'determined', 'disputed', 'finalized', 'settled', 'amended',
]);

// Provider epochs may be Unix seconds or milliseconds. Never let Date.parse
// reinterpret numeric strings as years, dates or relative sporting clock values.
function ms(value) {
  if (value == null || value === '' || typeof value === 'boolean') return 0;
  if (typeof value === 'number' || /^[+-]?\d+(?:\.\d+)?$/.test(String(value).trim())) {
    const n=Number(value);
    if(!Number.isFinite(n))return 0;
    if(n>=946684800000&&n<=7258118400000)return Math.round(n);
    if(n>=946684800&&n<=7258118400)return Math.round(n*1000);
    return 0;
  }
  const parsed=Date.parse(String(value));
  return Number.isFinite(parsed)&&parsed>=946684800000&&parsed<=7258118400000?parsed:0;
}

function token(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function cleanString(value, max = 160) {
  const s = String(value ?? '');
  return s.length > max ? s.slice(0, max) : s;
}

function stateBase(eventTicker, now) {
  return {
    version: GAME_CLOCK_AUTHORITY.version,
    policyRevision: GAME_CLOCK_AUTHORITY.policyRevision,
    eventTicker: String(eventTicker || ''),
    phase: 'UNKNOWN',
    confirmed: false,
    startTimeMs: null,
    source: null,
    sourceStrength: null,
    observedAtMs: null,
    // Proven start time is restart-safe provenance. Entry authorization is a
    // separate, short-lived permission and is never carried through an outage.
    entryAuthorized: false,
    evidenceObservedAtMs: null,
    authorizationReason: null,
    authorizationSource: null,
    sourceObservationAtMs: null,
    sportingStatus: null,
    lastCheckedAtMs: Number(now),
    milestoneId: null,
    milestoneType: null,
    milestoneStartMs: null,
    occurrenceTimeMs: null,
    occurrenceConflict: false,
    observedActivityStartMs: null,
    observedActivityLastEvidenceMs: null,
    observedActivityEvidenceCount: 0,
    // R29: these are observed-status bounds, NEVER an asserted kickoff.
    pregameObservedAtMs: null,
    pregameMilestoneId: null,
    pregameObservationAccepted: false,
    pregameProofObservedAtMs: null,
    boundedStartLowerMs: null,
    boundedStartUpperMs: null,
    boundedStartEvidenceSource: null,
    boundedProofObservedAtMs: null,
    // Reference for strategy's estimated scheduled-time window only. This is
    // never a verified actual kickoff or a mathematically bounded start.
    scheduleReferenceMilestoneId: null,
    reason: 'no_authoritative_evidence',
    evidence: {},
  };
}


const LEGACY_ESTIMATED_SOURCES = new Set([
  'kalshi_live_data','kalshi_game_stats','observed_market_activity',
  'occurrence_passed','simulation_observed_activity',
]);

/** Demote every legacy estimated start. Provenance is kept. Nothing is promoted. */

/** Read actual provider fields only; a published record timestamp is NOT the
 * time play began. Whole-game starts must be identified explicitly and, for
 * PBP events, anchored in the opening sporting period. No scheduled start,
 * first score, generic period `start`, or trading activity can prove kickoff.
 */
function openingSportingPeriod(period,index){
  const ordinal=period?.number ?? period?.period_number ?? period?.periodNumber
    ?? period?.sequence ?? period?.quarter ?? period?.half;
  if(ordinal!=null&&ordinal!==''){
    const n=Number(ordinal);
    if(Number.isFinite(n))return n===1;
    const t=token(ordinal);
    if(['first','firsthalf','firstquarter','periodone','period1','quarter1','q1','h1','half1','1st'].includes(t))return true;
    if(t&&/^(?:[2-9]|q[2-9]|h[2-9]|period[2-9]|quarter[2-9]|half[2-9]|second|third|fourth|overtime)/.test(t))return false;
    return false;
  }
  const label=token(period?.type || period?.name || period?.label || '');
  if(label){
    if(['first','firsthalf','firstquarter','period1','quarter1','q1','h1','half1','1st'].includes(label))return true;
    if(/^(?:[2-9]|q[2-9]|h[2-9]|period[2-9]|quarter[2-9]|half[2-9]|second|third|fourth|overtime)/.test(label))return false;
    return false;
  }
  // Unlabeled first PBP period is the only permissible positional fallback.
  return index===0;
}

function directWholeGameStatus(liveData) {
  const details=(liveData?.live_data||liveData)?.details;
  if(!details||typeof details!=='object'||Array.isArray(details))return null;
  // Child period/player/scoreboard statuses cannot bracket the whole game.
  const raw=details.status ?? details.game_status ?? details.match_status ?? details.event_status;
  const t=token(raw);
  if(POSITIVE_STATUS.has(t))return 'live';
  if(PRESTART_BOUND_STATUS.has(t))return 'pregame';
  if(FINAL_STATUS.has(t))return 'final';
  return null;
}

function boundedObservation(liveRecord,liveClass,kind,now) {
  if(!liveRecord||liveRecord.error||liveClass?.delayed===true||liveClass?.classification!==kind
    ||directWholeGameStatus(liveRecord.value)!==kind)return 0;
  // Use the start of the actual provider request for pregame's lower bound,
  // and the end of the request for LIVE's upper bound. Cache hits NEVER
  // mint a new provider observation time. Network latency is bounded.
  const requested=Number(liveRecord.requestedAtMs||0);
  const received=Number(liveRecord.observedAtMs||0);
  const age=Number(now)-received;
  if(!Number.isSafeInteger(requested)||!Number.isSafeInteger(received)
    ||requested<=0||received<requested
    ||received-requested>GAME_CLOCK_AUTHORITY.boundedProviderRequestMaximumMs
    ||age< -2000||age>GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs)return 0;
  return kind==='pregame'?requested:received;
}

function unusableScanLive(record,id){
  if(!record||record.entryQuality===true)return false;
  if(record.error||!record.value)return true;
  const requested=Number(record.requestedAtMs||0),received=Number(record.observedAtMs||0);
  const raw=record.value?.live_data||record.value,details=raw?.details;
  const slow=!Number.isSafeInteger(requested)||!Number.isSafeInteger(received)||requested<=0||received<requested||received-requested>GAME_CLOCK_AUTHORITY.boundedProviderRequestMaximumMs;
  const delayed=details?.live_data_delayed===true||String(details?.live_data_delayed).toLowerCase()==='true';
  if(!slow&&!delayed)return false;
  const cls=classifyLiveData(raw);
  if(cls.classification==='final'||cls.classification==='conflict'||(cls.milestoneId&&cls.milestoneId!==String(id)))return false;
  return true;
}

function explicitActualStart(value){
  if(!value||typeof value!=='object')return null;
  // These names assert *actual* start. Do not accept start_date,
  // scheduled_start, generic started_at, created_at or updated_at.
  for(const key of ['actual_start_time','actual_start_at','actual_started_at',
    'actual_kickoff_time','actual_tipoff_time','actual_start_timestamp']){
    const t=ms(value[key]);if(t>0)return {atMs:t,source:`explicit_${key}`};
  }
  return null;
}

export function extractOfficialSportingEvidence(liveData, gameStats, milestone){
  const rawLive=liveData?.live_data || liveData;
  const details=rawLive?.details && typeof rawLive.details==='object' ? rawLive.details : {};
  const scheduled=ms(milestone?.start_date)||null;
  const periods=gameStats?.pbp?.periods || gameStats?.game_stats?.pbp?.periods || [];
  let firstActionAtMs=null,actualStartMs=null,actualSource=null;
  let periodCount=0,eventCount=0,remainingMs=null,clockLabel=null;
  const direct=explicitActualStart(details) || explicitActualStart(gameStats);
  if(direct){actualStartMs=direct.atMs;actualSource=direct.source;}
  const WHOLE_START_TYPES=new Set(['gamestart','matchstart','openingkickoff','openingtipoff']);
  if(Array.isArray(periods)){
    periodCount=periods.length;
    for(const [index,period] of periods.slice(0,64).entries()){
      const events=Array.isArray(period?.events)?period.events:[];
      const opening=openingSportingPeriod(period,index);
      for(const e of events){
        if(!e||typeof e!=='object')continue;
        eventCount++;
        // A game-clock value like "12:00", publication `created_at`, or a
        // period-relative `time` is not a wall-clock action timestamp.
        const at=ms(e.event_timestamp ?? e.occurred_at ?? e.timestamp);
        if(at&&(firstActionAtMs==null||at<firstActionAtMs))firstActionAtMs=at;
        const type=token(e.type || e.event_type || e.play_type || '');
        if(!actualStartMs&&opening&&at&&WHOLE_START_TYPES.has(type)){
          actualStartMs=at;actualSource='pbp_explicit_opening_game_start';
        }
      }
    }
  }
  const remaining=Number(details.remaining_ms ?? details.time_remaining_ms ?? details.clock_remaining_ms);
  if((details.remaining_ms!=null || details.time_remaining_ms!=null || details.clock_remaining_ms!=null)
    &&Number.isFinite(remaining)&&remaining>=0)remainingMs=remaining;
  if(typeof details.clock==='string')clockLabel=details.clock;
  return {scheduledStartMs:scheduled,actualStartMs,actualStartEvidenceSource:actualSource,
    actualStartConfidence:actualStartMs?'proven':'unknown',firstActionAtMs,
    liveStatus:cleanString(details.status||''),periodCount,pbpEventCount:eventCount,
    remainingMs,clockLabel,
    lateGame:remainingMs===0||(typeof clockLabel==='string'&&/^(0:00|00:00)$/.test(clockLabel))};
}

export function migrateLegacyClockState(raw){
  if(!raw||typeof raw!=='object')return raw;
  const version=String(raw.version||'');
  if(version===GAME_CLOCK_AUTHORITY.version)return raw;
  if(!GAME_CLOCK_AUTHORITY.legacyVersions.includes(version))return null;
  if(version==='GCA2-R4'){
    // R26 admitted a generic second-period `start` as a proven match start.
    // Its unvalidated PBP proof cannot be trusted after this correction.
    const oldPbp=raw.actualStartConfidence==='proven'
      && raw.actualStartEvidenceSource==='pbp_explicit_start_event';
    return {...raw,version:GAME_CLOCK_AUTHORITY.version,
      ...(oldPbp?{
        legacyObservedStartMs:Number(raw.actualStartMs||raw.startTimeMs||0)||null,
        legacyObservedSource:'r26_unverified_pbp_start',
        phase:raw.phase==='FINAL'?'FINAL':raw.phase==='CONFLICT'?'CONFLICT':'LIVE_START_UNKNOWN',
        confirmed:false,startTimeMs:null,actualStartMs:null,
        actualStartEvidenceSource:null,actualStartConfidence:'unknown',
        actualStartLastVerifiedMs:null,reason:'r26_unverified_start_demoted',
      }:{}),
      entryAuthorized:false,evidenceObservedAtMs:null,
      authorizationReason:null,authorizationSource:null};
  }
  const source=String(raw.source||'');
  const estimated=LEGACY_ESTIMATED_SOURCES.has(source)||source==='simulation_observed_activity';
  if(!estimated)return {...raw,version:GAME_CLOCK_AUTHORITY.version};
  return {
    ...raw,
    version:GAME_CLOCK_AUTHORITY.version,
    phase:raw.phase==='FINAL'?'FINAL':raw.phase==='CONFLICT'?'CONFLICT':'LIVE_START_UNKNOWN',
    confirmed:false,
    actualStartMs:null,
    actualStartEvidenceSource:null,
    actualStartConfidence:'unknown',
    scheduledStartMs:Number(raw.milestoneStartMs||raw.occurrenceTimeMs||0)||null,
    legacyObservedStartMs:Number(raw.startTimeMs||0)||null,
    legacyObservedSource:source||null,
    startTimeMs:null,
    entryAuthorized:false,
    authorizationReason:null,
    authorizationSource:null,
    reason:'legacy_estimated_start_demoted',
  };
}

// The provider observation is the causal version. A poll/retry/check timestamp
// says when local work finished; it cannot make an older sporting fact newer.
export function clockSourceObservationMs(raw){
  const checked=Number(raw?.lastCheckedAtMs||0);
  const valid=n=>Number.isSafeInteger(n)&&n>=946684800000
    &&(!checked||n<=checked+2000);
  const explicit=Number(raw?.sourceObservationAtMs);
  if(raw?.sourceObservationAtMs!=null&&(explicit===0||valid(explicit)))return explicit;
  const pregame=raw?.pregameObservationAccepted===true
    ||raw?.evidence?.pregameProviderObservationAccepted===true;
  const candidates=[
    ['live','pregame','final','conflict'].includes(raw?.liveStatus)?raw?.liveStatusObservedAtMs:0,
    ['CONFIRMED','BOUNDED','SCHEDULE_LIVE','FINAL','CONFLICT'].includes(raw?.phase)?raw?.evidenceObservedAtMs:0,
    raw?.actualStartConfidence==='proven'?raw?.actualStartLastVerifiedMs:0,
    raw?.phase==='BOUNDED'?raw?.boundedProofObservedAtMs:0,
    pregame?raw?.pregameProofObservedAtMs:0,pregame?raw?.pregameObservedAtMs:0,
  ];
  return Math.max(0,...candidates.map(value=>valid(Number(value))?Number(value):0));
}

export function normalizeGameClockState(raw, eventTicker = '') {
  raw = migrateLegacyClockState(raw);
  const version = String(raw?.version || '');
  if (!raw || typeof raw !== 'object' || (version !== GAME_CLOCK_AUTHORITY.version && !GAME_CLOCK_AUTHORITY.legacyVersions.includes(version))) return null;
  const phase = ['UNKNOWN', 'CONFIRMED', 'BOUNDED', 'SCHEDULE_LIVE', 'FINAL', 'CONFLICT', 'LIVE_START_UNKNOWN'].includes(String(raw.phase)) ? String(raw.phase) : 'UNKNOWN';
  const start = Number(raw.startTimeMs || 0);
  const actual = Number(raw.actualStartMs || 0);
  const proven = raw.actualStartConfidence === 'proven' && Number.isFinite(actual) && actual > 0;
  const confirmed = phase === 'CONFIRMED' && raw.confirmed === true && proven;
  const lower=Number(raw.boundedStartLowerMs||0),upper=Number(raw.boundedStartUpperMs||0);
  const boundedProof=Number(raw.boundedProofObservedAtMs||raw.evidenceObservedAtMs||0);
  const bounded=phase==='BOUNDED' && raw.confirmed===false
    &&raw.actualStartConfidence==='bounded'&&raw.source==='kalshi_live_data_status_transition'
    &&raw.boundedStartEvidenceSource==='matched_milestone_pregame_to_live'
    &&String(raw.pregameMilestoneId||'')!==''
    &&String(raw.pregameMilestoneId)===String(raw.milestoneId||'')
    &&Number.isSafeInteger(lower)&&Number.isSafeInteger(upper)
    &&lower>=946684800000&&upper>lower
    &&Number(raw.pregameObservedAtMs)===lower
    &&upper-lower<=GAME_CLOCK_AUTHORITY.boundedStartMaximumSpanMs
    &&Number(raw.actualStartMs||0)===0&&Number(raw.startTimeMs||0)===0
    &&Number.isSafeInteger(boundedProof)&&boundedProof>=upper
    &&boundedProof<=Number(raw.lastCheckedAtMs)+2000
    &&Number(raw.lastCheckedAtMs)>=upper;
  const pregameAt=Number(raw.pregameObservedAtMs||0);
  const pregameId=String(raw.pregameMilestoneId||'');
  // Legacy timestamps are provenance only when the old observation was
  // explicitly accepted, or belongs to a structurally valid status bracket.
  // A naked timestamp/identity pair must never become a kickoff lower bound.
  const acceptedPregame=(bounded||raw.pregameObservationAccepted===true
      ||raw.evidence?.pregameProviderObservationAccepted===true)
    &&Number.isSafeInteger(pregameAt)&&pregameAt>=946684800000&&pregameId!==''
    &&pregameAt<=Number(raw.lastCheckedAtMs||0)+2000
    &&(!raw.milestoneId||pregameId===String(raw.milestoneId));
  const pregameProof=Number(raw.pregameProofObservedAtMs||pregameAt);
  const pregameValid=acceptedPregame&&Number.isSafeInteger(pregameProof)
    &&pregameProof>=pregameAt&&pregameProof<=Number(raw.lastCheckedAtMs||0)+2000;
  const officialSchedule=Number(raw.scheduledStartMs||0);
  const scheduleLive=phase==='SCHEDULE_LIVE'&&raw.confirmed===false
    &&raw.actualStartConfidence==='scheduled_estimate'
    &&raw.source==='kalshi_milestone_schedule_fresh_live_reference'
    &&String(raw.scheduleReferenceMilestoneId||'')!==''
    &&String(raw.scheduleReferenceMilestoneId)===String(raw.milestoneId||'')
    &&Number.isSafeInteger(officialSchedule)&&officialSchedule>=946684800000
    &&officialSchedule===Number(raw.milestoneStartMs||0)
    &&Number(raw.actualStartMs||0)===0&&Number(raw.startTimeMs||0)===0
    &&Number(raw.boundedStartLowerMs||0)===0&&Number(raw.boundedStartUpperMs||0)===0;
  const durable=raw.persistenceKind==='durable_clock_proof';
  const evidenceObservedAtMs = durable?null:(Number(raw.evidenceObservedAtMs || 0) || null);
  return {
    ...stateBase(raw.eventTicker || eventTicker, Number(raw.lastCheckedAtMs || Date.now())),
    ...raw,
    policyRevision: GAME_CLOCK_AUTHORITY.policyRevision,
    version: GAME_CLOCK_AUTHORITY.version,
    eventTicker: String(raw.eventTicker || eventTicker || ''),
    phase: (phase==='BOUNDED'&&!bounded)||(phase==='SCHEDULE_LIVE'&&!scheduleLive)?'LIVE_START_UNKNOWN':phase,
    confirmed,
    startTimeMs: Number.isFinite(start) && start > 0 && confirmed ? start : null,
    boundedStartLowerMs: bounded ? lower : null,
    boundedStartUpperMs: bounded ? upper : null,
    boundedStartEvidenceSource: bounded ? 'matched_milestone_pregame_to_live' : null,
    boundedProofObservedAtMs: bounded ? boundedProof : null,
    scheduledStartMs: scheduleLive?officialSchedule:(Number(raw.scheduledStartMs||0)||null),
    scheduleReferenceMilestoneId: scheduleLive?String(raw.scheduleReferenceMilestoneId):null,
    pregameObservedAtMs: pregameValid?pregameAt:null,
    pregameMilestoneId: pregameValid?pregameId:null,
    pregameObservationAccepted: Boolean(pregameValid),
    pregameProofObservedAtMs: pregameValid?pregameProof:null,
    sourceObservationAtMs: clockSourceObservationMs({...raw,
      pregameObservedAtMs:pregameValid?pregameAt:null,
      pregameProofObservedAtMs:pregameValid?pregameProof:null,
      pregameObservationAccepted:Boolean(pregameValid),
      boundedProofObservedAtMs:bounded?boundedProof:null}),
    observedAtMs: Number(raw.observedAtMs || 0) || null,
    source: String(raw.source || '') === 'simulation_observed_activity' ? 'observed_market_activity' : (raw.source || null),
    sourceStrength: String(raw.source || '') === 'simulation_observed_activity' ? 'bounded_observed_activity' : (raw.sourceStrength || null),
    observedActivityStartMs: Number(raw.observedActivityStartMs || raw.simulationActivityStartMs || 0) || null,
    observedActivityLastEvidenceMs: Number(raw.observedActivityLastEvidenceMs || raw.simulationActivityLastEvidenceMs || 0) || null,
    observedActivityEvidenceCount: Math.max(0, Number(raw.observedActivityEvidenceCount || raw.simulationActivityEvidenceCount || 0) || 0),
    entryAuthorized: Boolean(!durable && (confirmed||bounded||scheduleLive) && raw.entryAuthorized === true && evidenceObservedAtMs),
    evidenceObservedAtMs,
    authorizationReason: raw.authorizationReason ? cleanString(raw.authorizationReason) : null,
    authorizationSource: raw.authorizationSource ? cleanString(raw.authorizationSource) : null,
    lastCheckedAtMs: Number(raw.lastCheckedAtMs || 0) || null,
    milestoneStartMs: Number(raw.milestoneStartMs || 0) || null,
    occurrenceTimeMs: Number(raw.occurrenceTimeMs || 0) || null,
    occurrenceConflict: Boolean(raw.occurrenceConflict),
    evidence: raw.evidence && typeof raw.evidence === 'object' ? raw.evidence : {},
  };
}

export function latestSameEventClockState(event,...values){
  const key=String(event||'');let selected=null;
  for(const raw of values){
    const state=normalizeGameClockState(raw,key);
    if(!state||state.eventTicker!==key)continue;
    if(!selected){selected=state;continue;}
    if(selected.phase==='FINAL'&&state.phase!=='FINAL')continue;
    if(state.phase==='FINAL'&&selected.phase!=='FINAL'){selected=state;continue;}
    const selectedSource=clockSourceObservationMs(selected),nextSource=clockSourceObservationMs(state);
    if(nextSource<selectedSource)continue;
    if(selected.phase==='CONFLICT'&&state.phase!=='CONFLICT'){
      const newExplicitProof=state.phase==='CONFIRMED'&&state.confirmed===true
        &&state.actualStartConfidence==='proven'&&nextSource>selectedSource
        &&Number(state.actualStartLastVerifiedMs||0)>selectedSource;
      if(!newExplicitProof)continue;
    }
    if(nextSource===selectedSource){
      if(state.phase==='CONFLICT'&&selected.phase!=='CONFLICT'){selected=state;continue;}
      if(Number(state.lastCheckedAtMs||0)<Number(selected.lastCheckedAtMs||0))continue;
      // A persistent knowledge projection must not overwrite the permission
      // obtained from the same in-memory observation.
      if(state.persistenceKind==='durable_clock_proof'
        &&selected.persistenceKind!=='durable_clock_proof')continue;
    }
    selected=state;
  }
  return selected;
}

export function expireGameClockAuthorization(raw,eventTicker='',now=Date.now(),
  maxAgeMs=GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs){
  const state=normalizeGameClockState(raw,eventTicker);
  if(!state||state.entryAuthorized!==true
    ||entryAuthorizedNormalized(state,eventTicker,now,maxAgeMs))return state;
  return {...state,entryAuthorized:false,evidenceObservedAtMs:null,
    authorizationReason:null,authorizationSource:null};
}

function confirmedNormalized(s,expectedEventTicker=''){
  if (!(s?.confirmed && s.phase === 'CONFIRMED' && s.startTimeMs > 0)) return false;
  const expected = String(expectedEventTicker || '');
  return !expected || s.eventTicker === expected;
}

export function isConfirmedGameClockState(raw, expectedEventTicker = '') {
  return confirmedNormalized(normalizeGameClockState(raw,expectedEventTicker),expectedEventTicker);
}

export function isEntryAuthorizedGameClockState(
  raw,
  expectedEventTicker = '',
  now = Date.now(),
  maxAgeMs = GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs,
) {
  const s = normalizeGameClockState(raw, expectedEventTicker);
  return entryAuthorizedNormalized(s,expectedEventTicker,now,maxAgeMs);
}

// These helpers are private: callers at public boundaries still validate the
// raw state once. Rechecking an immutable local normalized value need not
// allocate and validate the same sporting proof again. Permission is evaluated
// against the supplied current time on every call, never cached across time.
function entryAuthorizedNormalized(s,expectedEventTicker,now,maxAgeMs){
  const approved=s&&(confirmedNormalized(s,expectedEventTicker)
    ||(s.phase==='BOUNDED'&&s.confirmed===false
      &&Number(s.boundedStartLowerMs)>0&&Number(s.boundedStartUpperMs)>Number(s.boundedStartLowerMs)
      &&String(s.milestoneId||'')!==''&&s.milestoneId===s.pregameMilestoneId
      &&(!expectedEventTicker||s.eventTicker===String(expectedEventTicker)))
    ||(s.phase==='SCHEDULE_LIVE'&&s.actualStartConfidence==='scheduled_estimate'
      &&s.scheduleReferenceMilestoneId===s.milestoneId
      &&Number(s.scheduledStartMs)>0
      &&(!expectedEventTicker||s.eventTicker===String(expectedEventTicker))));
  if (!approved || s.entryAuthorized !== true || s.liveStatus !== 'live'
    || s.liveDataDelayed === true || s.occurrenceConflict===true) return false;
  const observed = Number(s.evidenceObservedAtMs || 0);
  const t = Number(now);
  const maxAge = Math.max(0, Number(maxAgeMs) || 0);
  if (!Number.isFinite(observed) || observed <= 0 || !Number.isFinite(t) || t <= 0) return false;
  if(s.phase==='SCHEDULE_LIVE'){
    const referenceAge=t-Number(s.scheduledStartMs);
    if(referenceAge<0||referenceAge>GAME_CLOCK_AUTHORITY.scheduleReferenceMaximumAgeMs)return false;
  }
  const age = t - observed;
  return age >= -2000 && age <= maxAge;
}

export function authoritativeClockSnapshot(raw, expectedEventTicker = '') {
  const s = normalizeGameClockState(raw, expectedEventTicker);
  if (!confirmedNormalized(s, expectedEventTicker)) return null;
  return {
    version: s.version,
    eventTicker: s.eventTicker,
    phase: 'CONFIRMED',
    confirmed: true,
    startTimeMs: s.startTimeMs,
    source: s.source,
    sourceStrength: s.sourceStrength,
    observedAtMs: s.observedAtMs,
    evidenceObservedAtMs: s.evidenceObservedAtMs,
    entryAuthorizedAtEntry: Boolean(s.entryAuthorized),
    authorizationSourceAtEntry: s.authorizationSource || null,
    milestoneId: s.milestoneId,
    milestoneType: s.milestoneType,
  };
}

function collectLiveSignals(value, out, path = 'details', depth = 0) {
  if (value == null || depth > 4 || out.length >= 32) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) collectLiveSignals(item, out, path, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;
  for (const [rawKey, child] of Object.entries(value)) {
    if (out.length >= 32) break;
    const key = token(rawKey);
    const childPath = `${path}.${cleanString(rawKey, 40)}`;
    if (LIVE_BOOLEAN_KEYS.has(key) && typeof child === 'boolean') {
      out.push({ kind: child ? 'positive' : 'negative', path: childPath, value: child });
      continue;
    }
    if (STATUS_KEYS.has(key) && (typeof child === 'string' || typeof child === 'number')) {
      const t = token(child);
      if (FINAL_STATUS.has(t)) out.push({ kind: 'final', path: childPath, value: cleanString(child) });
      else if (POSITIVE_STATUS.has(t)) out.push({ kind: 'positive', path: childPath, value: cleanString(child) });
      else if (NEGATIVE_STATUS.has(t)) out.push({ kind: 'negative', path: childPath, value: cleanString(child) });
      continue;
    }
    if (child && typeof child === 'object' && SAFE_CONTAINER_KEYS.has(key)) {
      collectLiveSignals(child, out, childPath, depth + 1);
    }
  }
}

export function classifyLiveData(liveData) {
  const details = liveData?.details && typeof liveData.details === 'object' && !Array.isArray(liveData.details)
    ? liveData.details
    : {};
  const signals = [];
  collectLiveSignals(details, signals);
  const kinds = new Set(signals.map((x) => x.kind));
  let classification = 'unknown';
  // Contradictory whole-event lifecycle evidence must never be collapsed into
  // FINAL merely because one subtree says "complete". FINAL is sticky, so a
  // mixed final/live or final/pregame payload is a conflict and fails closed.
  if (kinds.has('final') && (kinds.has('positive') || kinds.has('negative'))) classification = 'conflict';
  else if (kinds.has('final')) classification = 'final';
  else if (kinds.has('positive') && kinds.has('negative')) classification = 'conflict';
  else if (kinds.has('positive')) classification = 'live';
  else if (kinds.has('negative')) classification = 'pregame';
  return {
    classification,
    type: cleanString(liveData?.type || ''),
    milestoneId: cleanString(liveData?.milestone_id || ''),
    delayed: details.live_data_delayed === true || String(details.live_data_delayed).toLowerCase()==='true',
    signals: signals.slice(0, 12),
  };
}

export function countPbpEvents(gameStats) {
  const periods = gameStats?.pbp?.periods || gameStats?.game_stats?.pbp?.periods;
  if (!Array.isArray(periods)) return 0;
  let count = 0;
  for (const period of periods.slice(0, 64)) {
    if (!Array.isArray(period?.events)) continue;
    count += period.events.filter((e) => e && typeof e === 'object' && Object.keys(e).length > 0).length;
    if (count > 0) return count;
  }
  return count;
}

function atomicMilestoneType(type) {
  const t = token(type);
  if (!t) return false;
  if (t.includes('tournament') || t.includes('season') || t.includes('multileg') || t.includes('series')) return false;
  return t.includes('game') || t.includes('match');
}

export function selectEventMilestone(milestones, eventTicker) {
  const event = String(eventTicker || '');
  if (!event) return { milestone: null, reason: 'missing_event_ticker', candidates: 0 };
  const unique = new Map();
  for (const m of Array.isArray(milestones) ? milestones : []) {
    if (m?.id && !unique.has(String(m.id))) unique.set(String(m.id), m);
  }
  const scored = [];
  for (const m of unique.values()) {
    const category = token(m.category);
    if (category !== 'sports' && category !== 'esports') continue;
    if (!atomicMilestoneType(m.type)) continue;
    const primary = Array.isArray(m.primary_event_tickers) ? m.primary_event_tickers.map(String) : [];
    const related = Array.isArray(m.related_event_tickers) ? m.related_event_tickers.map(String) : [];
    const inPrimary = primary.includes(event);
    const inRelated = related.includes(event);
    if (!inPrimary && !inRelated) continue;
    let score = inPrimary ? 300 : 200;
    const t = token(m.type);
    if (t.includes('match')) score += 20;
    if (t.includes('game')) score += 20;
    if (primary.length === 1 && inPrimary) score += 10;
    scored.push({ milestone: m, score });
  }
  scored.sort((a, b) => b.score - a.score || String(a.milestone.id).localeCompare(String(b.milestone.id)));
  if (!scored.length) return { milestone: null, reason: 'no_atomic_event_milestone', candidates: 0 };
  const best = scored[0];
  const tied = scored.filter((x) => x.score === best.score);
  if (tied.length > 1) {
    return {
      milestone: null,
      reason: 'ambiguous_atomic_milestone',
      candidates: tied.length,
      candidateIds: tied.map((x) => String(x.milestone.id)).slice(0, 8),
    };
  }
  return { milestone: best.milestone, reason: 'selected', candidates: scored.length };
}

function marketTerminal(quotes = []) {
  return quotes.some((q) => Boolean(q?.result) || TERMINAL_MARKET_STATUSES.has(String(q?.status || '').toLowerCase()));
}

function broadLive(quotes = []) {
  return quotes.some((q) => String(q?.liveStatus || '').toLowerCase() === 'live');
}

// The R14 occurrence fallback may establish conservative start provenance from
// the broad discovery classifier, but new exposure needs stronger CURRENT
// evidence. Only a freshly queried exact-market recent-trade observation can
// authorize the fallback at execution time. This prevents stale scan activity
// from being relabeled as fresh just because the clock resolver ran now.
function freshTradeActivity(quotes = [], now = Date.now(), maxAgeMs = GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs) {
  const t = Number(now);
  return quotes.some((q) => {
    if (String(q?.liveStatus || '').toLowerCase() !== 'live') return false;
    if (Number(q?.recentTrades || 0) < 3) return false;
    const observed = Number(q?.recentTradesObservedAtMs || 0);
    if (!Number.isFinite(observed) || observed <= 0 || !Number.isFinite(t)) return false;
    const age = t - observed;
    return age >= -2000 && age <= Math.max(0, Number(maxAgeMs) || 0);
  });
}

function coherentOccurrence(quotes = []) {
  const values = [...new Set(quotes.map((q) => Number(q?.occurrenceTimeMs || 0)).filter((x) => Number.isFinite(x) && x > 0))];
  if (!values.length) return { value: 0, coherent: true, values: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { value: min, coherent: max - min <= 5 * 60 * 1000, values };
}

function makeUnknown(eventTicker, now, reason, extra = {}) {
  return {
    ...stateBase(eventTicker, now),
    reason,
    ...extra,
    phase: 'UNKNOWN',
    confirmed: false,
    startTimeMs: null,
    entryAuthorized: false,
  };
}


function makeLiveUnknown(eventTicker, now, reason, extra = {}) {
  return {
    ...stateBase(eventTicker, now),
    ...extra,
    phase: 'LIVE_START_UNKNOWN',
    confirmed: false,
    startTimeMs: null,
    actualStartMs: null,
    actualStartConfidence: 'unknown',
    scheduledStartMs: Number(extra.milestoneStartMs || extra.occurrenceTimeMs || 0) || null,
    entryAuthorized: false,
    authorizationReason: null,
    authorizationSource: null,
    reason,
  };
}

// R36 owner-authorized strategy policy: a *scheduled reference* is not an
// actual kickoff. Keep its provenance explicit and separate from the true
// pregame->LIVE BOUNDED and actual-start CONFIRMED authorities.
function makeScheduledLiveReference(eventTicker,now,scheduledAt,milestoneId,extra={}){
  return {...stateBase(eventTicker,now),...extra,
    phase:'SCHEDULE_LIVE',confirmed:false,startTimeMs:null,actualStartMs:null,
    actualStartConfidence:'scheduled_estimate',actualStartEvidenceSource:null,
    source:'kalshi_milestone_schedule_fresh_live_reference',
    sourceStrength:'official_schedule_plus_matched_fresh_live_not_kickoff_proof',
    scheduledStartMs:Number(scheduledAt),scheduleReferenceMilestoneId:String(milestoneId),
    boundedStartLowerMs:null,boundedStartUpperMs:null,boundedStartEvidenceSource:null,
    entryAuthorized:extra.entryAuthorized===true,
    reason:extra.reason||'scheduled_reference_fresh_live_kickoff_unproven',
    lastCheckedAtMs:Number(now)};
}

function makeBounded(eventTicker,now,lower,upper,milestoneId,extra={}){
  return {...stateBase(eventTicker,now),...extra,
    phase:'BOUNDED',confirmed:false,startTimeMs:null,actualStartMs:null,
    actualStartConfidence:'bounded',actualStartEvidenceSource:null,
    source:'kalshi_live_data_status_transition',sourceStrength:'bounded_observed_live_status',
    boundedStartLowerMs:Number(lower),boundedStartUpperMs:Number(upper),
    boundedStartEvidenceSource:'matched_milestone_pregame_to_live',
    boundedProofObservedAtMs:Number(upper),
    pregameObservedAtMs:Number(lower),pregameMilestoneId:String(milestoneId),
    pregameObservationAccepted:true,
    pregameProofObservedAtMs:Number(extra.pregameProofObservedAtMs||lower),
    entryAuthorized:extra.entryAuthorized===true,
    reason:extra.reason||'bounded_start_from_matching_provider_status_transition',
    lastCheckedAtMs:Number(now)};
}

function makeConfirmed(eventTicker, now, startTimeMs, source, extra = {}) {
  const evidenceObservedAtMs = Number(extra.evidenceObservedAtMs || 0);
  return {
    ...stateBase(eventTicker, now),
    ...extra,
    phase: 'CONFIRMED',
    confirmed: true,
    startTimeMs: Number(startTimeMs),
    source,
    sourceStrength: source === 'occurrence_passed'
      ? 'fallback'
      : source === 'observed_market_activity'
        ? 'bounded_observed_activity'
        : 'strong',
    observedAtMs: Number(extra.observedAtMs || 0) || null,
    entryAuthorized: extra.entryAuthorized === true,
    evidenceObservedAtMs: Number.isFinite(evidenceObservedAtMs) && evidenceObservedAtMs > 0 ? evidenceObservedAtMs : null,
    authorizationReason: extra.entryAuthorized !== true ? null : (extra.authorizationReason || `fresh_${source}`),
    authorizationSource: extra.entryAuthorized !== true ? null : (extra.authorizationSource || source),
    lastCheckedAtMs: Number(now),
    reason: extra.reason || source,
  };
}

function makeTerminal(eventTicker, now, prior, reason, extra = {}) {
  return {
    ...stateBase(eventTicker, now),
    ...extra,
    phase: 'FINAL',
    terminalReason:prior?.phase==='FINAL'?(prior.terminalReason||prior.reason):reason,
    sportingStatus:'final',
    sourceObservationAtMs:Math.max(clockSourceObservationMs(prior),
      clockSourceObservationMs({...extra,phase:'FINAL',lastCheckedAtMs:Number(now)}),reason==='market_terminal'?Number(now):0),
    milestoneId:extra.milestoneId||prior?.milestoneId||null,
    confirmed: false,
    startTimeMs: Number(prior?.startTimeMs || 0) || null,
    actualStartMs: Number(prior?.actualStartMs || 0) || null,
    actualStartConfidence: prior?.actualStartConfidence || 'unknown',
    actualStartEvidenceSource: prior?.actualStartEvidenceSource || null,
    actualStartLastVerifiedMs: Number(prior?.actualStartLastVerifiedMs || 0) || null,
    boundedStartLowerMs: Number(prior?.boundedStartLowerMs||0)||null,
    boundedStartUpperMs: Number(prior?.boundedStartUpperMs||0)||null,
    boundedStartEvidenceSource: prior?.boundedStartEvidenceSource||null,
    pregameObservedAtMs: Number(prior?.pregameObservedAtMs||0)||null,
    pregameMilestoneId: prior?.pregameMilestoneId||null,
    pregameObservationAccepted:prior?.pregameObservationAccepted===true,
    pregameProofObservedAtMs:prior?.pregameProofObservedAtMs||null,
    scheduledStartMs: Number(prior?.scheduledStartMs || extra.milestoneStartMs || 0) || null,
    source: prior?.source || extra.source || null,
    sourceStrength: prior?.sourceStrength || extra.sourceStrength || null,
    observedAtMs: prior?.observedAtMs || null,
    entryAuthorized: false,
    evidenceObservedAtMs: Number(extra.evidenceObservedAtMs || 0) || null,
    authorizationReason: null,
    authorizationSource: null,
    reason,
  };
}

function makeConflict(eventTicker, now, prior, reason, extra = {}) {
  return {
    ...stateBase(eventTicker, now),
    ...extra,
    phase: 'CONFLICT',
    conflictReason:prior?.phase==='CONFLICT'?(prior.conflictReason||prior.reason):reason,
    sportingStatus:'conflict',
    sourceObservationAtMs:Math.max(clockSourceObservationMs(prior),
      clockSourceObservationMs({...extra,phase:'CONFLICT',lastCheckedAtMs:Number(now)})),
    milestoneId:extra.milestoneId||prior?.milestoneId||null,
    confirmed: false,
    startTimeMs: Number(prior?.startTimeMs || 0) || null,
    actualStartMs: Number(prior?.actualStartMs || 0) || null,
    actualStartConfidence: prior?.actualStartConfidence || 'unknown',
    actualStartEvidenceSource: prior?.actualStartEvidenceSource || null,
    actualStartLastVerifiedMs: Number(prior?.actualStartLastVerifiedMs || 0) || null,
    boundedStartLowerMs: Number(prior?.boundedStartLowerMs||0)||null,
    boundedStartUpperMs: Number(prior?.boundedStartUpperMs||0)||null,
    boundedStartEvidenceSource: prior?.boundedStartEvidenceSource||null,
    pregameObservedAtMs: Number(prior?.pregameObservedAtMs||0)||null,
    pregameMilestoneId: prior?.pregameMilestoneId||null,
    pregameObservationAccepted:prior?.pregameObservationAccepted===true,
    pregameProofObservedAtMs:prior?.pregameProofObservedAtMs||null,
    scheduledStartMs: Number(prior?.scheduledStartMs || extra.milestoneStartMs || 0) || null,
    source: prior?.source || extra.source || null,
    sourceStrength: prior?.sourceStrength || extra.sourceStrength || null,
    observedAtMs: prior?.observedAtMs || null,
    entryAuthorized: false,
    evidenceObservedAtMs: Number(extra.evidenceObservedAtMs || 0) || null,
    authorizationReason: null,
    authorizationSource: null,
    reason,
  };
}

async function concurrentMap(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return out;
}

export class GameClockAuthority {
  constructor({ kalshi, audit = async () => {}, now = () => Date.now(), maximumCacheEntries = GAME_CLOCK_AUTHORITY.maximumCacheEntries } = {}) {
    this.kalshi = kalshi;
    this.audit = audit;
    this.now = now;
    this.maximumCacheEntries = Math.max(32, Math.floor(Number(maximumCacheEntries) || GAME_CLOCK_AUTHORITY.maximumCacheEntries));
    this.milestoneCache = new Map();
    this.seriesMilestoneCache = new Map();
    this.milestonePromises = new Map();
    this.seriesMilestonePromises = new Map();
    this.liveCache = new Map();
    this.statsCache = new Map();
    this.livePromises = new Map();
    this.statsPromises = new Map();
  }

  setBoundedCache(cache, key, record) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, record);
    while (cache.size > this.maximumCacheEntries) cache.delete(cache.keys().next().value);
    return record;
  }

  pruneCaches() {
    for (const cache of [this.milestoneCache,this.seriesMilestoneCache,this.liveCache,this.statsCache]) {
      while (cache.size > this.maximumCacheEntries) cache.delete(cache.keys().next().value);
    }
  }

  resourceSnapshot() {
    return {
      milestones:this.milestoneCache.size,
      milestoneSeries:this.seriesMilestoneCache.size,
      milestoneLookupsInFlight:this.milestonePromises.size + this.seriesMilestonePromises.size,
      live:this.liveCache.size,
      stats:this.statsCache.size,
      liveLookupsInFlight:this.livePromises.size,
      statsLookupsInFlight:this.statsPromises.size,
      maximumEntriesPerCache:this.maximumCacheEntries,
      bounded:true,
    };
  }

  async cached(cache, key, ttlMs, fn, { forceFresh = false, inFlight = null, forceRefreshMinAgeMs = ttlMs, clockPriority=null, retryUnusable=null } = {}) {
    const checkAtMs = Number(this.now());
    const hit = cache.get(key);
    if (hit && checkAtMs - hit.observedAtMs >= -2000 && checkAtMs - hit.observedAtMs <= ttlMs
      && (!forceFresh || checkAtMs - hit.observedAtMs <= forceRefreshMinAgeMs)
      && !(forceFresh&&retryUnusable?.(hit,key))) {
      return { ...hit, fromCache: true };
    }
    if (inFlight?.has(key)) {
      const shared=await joinClockWork(inFlight.get(key),clockPriority,forceFresh);
      if(forceFresh&&retryUnusable?.(shared,key))return this.cached(cache,key,ttlMs,fn,{forceFresh,inFlight,forceRefreshMinAgeMs,clockPriority,retryUnusable});
      return shared;
    }
    const signal=new ClockPriority(forceFresh),detach=inheritClockPriority(clockPriority,signal);
    const promise = (async () => {
      let value = null;
      let error = null;
      try { value = await fn(signal); } catch (e) { error = cleanString(e?.message || e, 240); }
      const observedAtMs = Number(this.now());
      const record = { value, error, requestedAtMs:checkAtMs, observedAtMs, fromCache: false,entryQuality:forceFresh===true };
      this.setBoundedCache(cache, key, record);
      return record;
    })().finally(() => {detach();inFlight?.delete(key);});
    promise.clockPriority=signal;
    if (inFlight) inFlight.set(key, promise);
    return promise;
  }

  async seriesMilestonesForSeries(seriesTicker, { forceFresh = false, entryIntent = forceFresh, clockPriority=null } = {}) {
    const series = String(seriesTicker || '');
    if (!series || typeof this.kalshi?.getMilestonesForSeries !== 'function') return { rows: [], error: null, observedAtMs: Number(this.now()) };
    const now = Number(this.now());
    const hit = this.seriesMilestoneCache.get(series);
    const forceAllowed = !hit || now - Number(hit.observedAtMs || 0) >= GAME_CLOCK_AUTHORITY.milestoneForceRefreshMinIntervalMs;
    if (hit && (!forceFresh || !forceAllowed) && now - Number(hit.observedAtMs || 0) <= GAME_CLOCK_AUTHORITY.seriesMilestoneCacheMs) return hit;
    if (this.seriesMilestonePromises.has(series)) return joinClockWork(this.seriesMilestonePromises.get(series),clockPriority,entryIntent);
    const signal=new ClockPriority(entryIntent),detach=inheritClockPriority(clockPriority,signal);
    const promise = (async () => {
      let rows = [];
      let error = null;
      try { rows = await this.kalshi.getMilestonesForSeries(series,200,{entryIntent,clockPriority:signal}) || []; }
      catch (e) { error = cleanString(e?.message || e, 240); }
      const record = { rows, error, observedAtMs: Number(this.now()) };
      this.setBoundedCache(this.seriesMilestoneCache, series, record);
      return record;
    })().finally(() => {detach();this.seriesMilestonePromises.delete(series);});
    promise.clockPriority=signal;
    this.seriesMilestonePromises.set(series, promise);
    return promise;
  }

  async milestoneForEvent(eventTicker, { seriesTicker = '', forceFresh = false, directOnSeriesMiss = false, clockPriority=null } = {}) {
    const event = String(eventTicker || '');
    const series = String(seriesTicker || '');
    const cacheKey = `${event}|${series}`;
    const now = Number(this.now());
    const scanOnlyMiss=value=>Boolean(value&&!value.milestone
      &&value.discoverySource==='series_events_with_milestones'
      &&value.directReason==null&&value.reason==='no_atomic_event_milestone');
    const hit = this.milestoneCache.get(cacheKey);
    const entryEscalation=forceFresh&&scanOnlyMiss(hit?.value);
    if (hit) {
      let ttl = GAME_CLOCK_AUTHORITY.missingMilestoneCacheMs;
      if (hit.value?.milestone) ttl = GAME_CLOCK_AUTHORITY.milestoneCacheMs;
      else if (hit.value?.reason === 'ambiguous_atomic_milestone') ttl = GAME_CLOCK_AUTHORITY.ambiguousMilestoneCacheMs;
      else if (hit.value?.reason === 'milestone_lookup_failed') ttl = GAME_CLOCK_AUTHORITY.milestoneFailureBackoffMs;
      const age = now - Number(hit.atMs || 0);
      // Entry-boundary freshness applies to live status and exact trades, not to
      // immutable milestone identity metadata. A force-fresh entry may retry a
      // negative selection after a short bounded interval, but it may never
      // hammer the provider once per candidate/attack.
      // R35: a negative SERIES-ONLY cache belongs to the old observation role.
      // When an exact-event pregame scout is later selected, a 5-minute
      // negative cache must not suppress the single fallback to official
      // related-event evidence. A 30-second minimum prevents retry storms.
      const eligibleScoutEscalation=Boolean(directOnSeriesMiss
        &&!hit.value?.milestone
        &&hit.value?.discoverySource==='series_events_with_milestones'
        &&hit.value?.directReason==null
        &&hit.value?.reason!=='ambiguous_atomic_milestone'
        &&age>=GAME_CLOCK_AUTHORITY.milestoneForceRefreshMinIntervalMs);
      if (age <= ttl && !eligibleScoutEscalation && !entryEscalation
        &&(!forceFresh || hit.value?.milestone || age < GAME_CLOCK_AUTHORITY.milestoneForceRefreshMinIntervalMs))
        return hit.value;
      this.milestoneCache.delete(cacheKey);
    }
    if (this.milestonePromises.has(cacheKey)) {
      const shared=await joinClockWork(this.milestonePromises.get(cacheKey),clockPriority,forceFresh);
      // A scan-only result did not perform the exact-event lookup. Promote
      // once after joining that weaker request, never bypass an ambiguity.
      if(forceFresh&&scanOnlyMiss(shared))return this.milestoneForEvent(event,{seriesTicker:series,forceFresh,directOnSeriesMiss,clockPriority});
      return shared;
    }

    const signal=new ClockPriority(forceFresh),detach=inheritClockPriority(clockPriority,signal);
    const promise = (async () => {
      let seriesRows = [];
      let seriesError = null;
      if (series && typeof this.kalshi?.getMilestonesForSeries === 'function') {
        const seriesRecord = await this.seriesMilestonesForSeries(series, { forceFresh:forceFresh&&!entryEscalation, entryIntent:forceFresh,clockPriority:signal });
        seriesRows = seriesRecord.rows || [];
        seriesError = seriesRecord.error || null;
        const seriesSelection = selectEventMilestone(seriesRows, event);
        // A multi-milestone identity is a real safety conflict. A narrower
        // second provider query must not silently pick a winner or overwrite
        // the ambiguous evidence, even under a force-fresh entry request.
        if(seriesSelection.reason==='ambiguous_atomic_milestone'){
          const value={...seriesSelection,discoverySource:'series_events_with_milestones',
            directReason:null,directError:null,seriesError};
          this.setBoundedCache(this.milestoneCache,cacheKey,{atMs:Number(this.now()),value});
          return value;
        }
        if (seriesSelection.milestone) {
          const value = { ...seriesSelection, discoverySource:'series_events_with_milestones', directReason:null, directError:null, seriesError };
          this.setBoundedCache(this.milestoneCache, cacheKey, { atMs:Number(this.now()), value });
          return value;
        }
        // Scan-time authority resolves whole batches. If the reusable complete
        // series page has no exact atomic milestone, stop here; the mandatory
        // force-fresh pre-entry boundary may perform one exact related-event
        // lookup after the negative-cache interval.
        if (!forceFresh && !seriesError && !directOnSeriesMiss) {
          const value = { ...seriesSelection, discoverySource:'series_events_with_milestones', directReason:null, directError:null, seriesError:null };
          this.setBoundedCache(this.milestoneCache, cacheKey, { atMs:Number(this.now()), value });
          return value;
        }
      }

      let direct = [];
      let directError = null;
      try { direct = await this.kalshi?.getMilestonesForEvent?.(event,500,{entryIntent:forceFresh,clockPriority:signal}) || []; }
      catch (e) { directError = cleanString(e?.message || e, 240); }
      const directSelection = selectEventMilestone(direct, event);
      if (directSelection.milestone) {
        const value = { ...directSelection, discoverySource:'related_event_ticker', directError, seriesError };
        this.setBoundedCache(this.milestoneCache, cacheKey, { atMs:Number(this.now()), value });
        return value;
      }

      // Backward-compatible fallback for mocked/older clients that do not expose
      // the new reusable series primitive.
      let viaSeries = seriesRows;
      if (!viaSeries.length && typeof this.kalshi?.getMilestonesForSeries !== 'function' && typeof this.kalshi?.getMilestonesForSeriesEvent === 'function') {
        try { viaSeries = await this.kalshi.getMilestonesForSeriesEvent(event, series) || []; }
        catch (e) { seriesError = cleanString(e?.message || e, 240); }
      }
      const merged = new Map();
      for (const m of [...direct, ...viaSeries]) if (m?.id) merged.set(String(m.id), m);
      const combinedSelection = selectEventMilestone([...merged.values()], event);
      let value = {
        ...combinedSelection,
        discoverySource: combinedSelection.milestone && viaSeries.some((m) => String(m?.id || '') === String(combinedSelection.milestone.id))
          ? 'series_events_with_milestones'
          : 'related_event_ticker',
        directReason: directSelection.reason,
        directError,
        seriesError,
      };
      if (!combinedSelection.milestone && directError && (!viaSeries.length || seriesError)) {
        value = { ...value, reason:'milestone_lookup_failed', error:`related=${directError}${seriesError ? `; series=${seriesError}` : ''}` };
      }
      this.setBoundedCache(this.milestoneCache, cacheKey, { atMs:Number(this.now()), value });
      return value;
    })().finally(() => {detach();this.milestonePromises.delete(cacheKey);});
    promise.clockPriority=signal;
    this.milestonePromises.set(cacheKey, promise);
    return promise;
  }

  async liveForMilestone(id, { forceFresh = false,clockPriority=null } = {}) {
    return this.cached(
      this.liveCache,
      String(id),
      GAME_CLOCK_AUTHORITY.liveDataCacheMs,
      async signal => this.kalshi?.getLiveData?.(id,{entryIntent:forceFresh,clockPriority:signal}),
      { forceFresh, inFlight: this.livePromises,clockPriority,retryUnusable:unusableScanLive,
        forceRefreshMinAgeMs: GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs },
    );
  }

  async statsForMilestone(id, { forceFresh = false,clockPriority=null } = {}) {
    return this.cached(
      this.statsCache,
      String(id),
      GAME_CLOCK_AUTHORITY.gameStatsCacheMs,
      async signal => this.kalshi?.getGameStats?.(id,{entryIntent:forceFresh,clockPriority:signal}),
      { forceFresh, inFlight: this.statsPromises,clockPriority },
    );
  }

  async resolveEvent(options={}){
    let optionalStatsExpiredLive=false;
    let state=await this.resolveEventEvidence({...options,
      onOptionalStatsExpiry:()=>{optionalStatsExpiredLive=true;}});
    const event=String(options.eventTicker||options.quotes?.[0]?.eventTicker
      ||options.quotes?.[0]?.ticker||'');
    let now=Math.max(Number(options.now)||0,Number(this.now())||0);
    // Optional stats may consume a previously accepted LIVE observation's
    // complete freshness budget. One entry-intent re-resolution is allowed,
    // using the cached stats and genuinely new LIVE evidence; no restamping.
    if(options.forceFresh===true&&optionalStatsExpiredLive
      &&!['FINAL','CONFLICT'].includes(state.phase)
      &&!isEntryAuthorizedGameClockState(state,event,now)){
      state=await this.resolveEventEvidence({...options,now,
        priorState:latestSameEventClockState(event,options.priorState,state)});
      now=Math.max(now,Number(this.now())||0);
    }
    // Optional stats, lookup queues and later work may consume the original
    // freshness budget. Resolve permissions at completion, not request start.
    return expireGameClockAuthorization(state?{...state,lastCheckedAtMs:now}:state,event,now);
  }

  async resolveEventEvidence({
    eventTicker,
    quotes = [],
    priorState = null,
    now = this.now(),
    allowGameStats = true,
    forceFresh = false,
    allowObservedActivityClock = false,
    minimumElapsedMs = 0,
    onOptionalStatsExpiry = null,
    clockPriority=null,
  } = {}) {
    const event = String(eventTicker || quotes[0]?.eventTicker || quotes[0]?.ticker || '');
    // Market payloads often omit series_ticker. Recover a strictly shaped
    // research series from the SAME event identity, without rewriting a quote
    // or treating the inferred series as sporting start evidence. The official
    // milestone must independently name the exact event to be accepted.
    const candidateSeries=[...new Set(quotes.map(researchSeriesForMarket).filter(Boolean))];
    const seriesTicker=candidateSeries.length===1?candidateSeries[0]:'';
    // If the bulk series endpoint excludes a scout event, its EXACT related-
    // event endpoint gets one cached fallback. The six-scout cap bounds this
    // lookup and protects broker/protection REST from unbounded fanout.
    const directOnSeriesMiss=quotes.some(q=>q?.clockProbeOnly===true);
    const normalizedPrior = normalizeGameClockState(priorState, event);
    const prior=normalizedPrior?.eventTicker===event?normalizedPrior:null;
    const occurrence = coherentOccurrence(quotes);
    const occurrenceTimeMs = occurrence.value || null;
    const decisionNow = () => Math.max(Number(now) || 0, Number(this.now()) || 0);

    if (marketTerminal(quotes)) {
      return makeTerminal(event, decisionNow(), prior, 'market_terminal', { occurrenceTimeMs });
    }
    // FINAL is terminal for new-exposure authority. A transient downstream API
    // recovery can never reopen a real-world event that we already proved ended.
    if (prior?.phase === 'FINAL') {
      return {
        ...prior,
        entryAuthorized: false,
        evidenceObservedAtMs: null,
        authorizationReason: null,
        authorizationSource: null,
        lastCheckedAtMs: decisionNow(),
        occurrenceTimeMs: occurrenceTimeMs || prior.occurrenceTimeMs || null,
        reason: 'persisted_final_retained',
      };
    }

    let milestoneSelection = null;
    let milestone = null;
    let liveClass = null;
    let liveError = null;
    let liveIdentityProblem = null;
    let pbpCount = 0;
    let statsError = null;
    try {
      milestoneSelection = await this.milestoneForEvent(event, { seriesTicker, forceFresh, directOnSeriesMiss,clockPriority });
      milestone = milestoneSelection?.milestone || null;
    } catch {
      milestoneSelection = { milestone: null, reason: 'milestone_lookup_failed', candidates: 0 };
    }

    const milestoneMeta = milestone ? {
      milestoneId: String(milestone.id),
      milestoneType: cleanString(milestone.type || ''),
      // Metadata only. Never a Hunter start-authority source.
      milestoneStartMs: ms(milestone.start_date) || null,
      milestoneEndMs: ms(milestone.end_date) || null,
      milestoneDiscoverySource: milestoneSelection?.discoverySource || null,
    } : { milestoneDiscoverySource: milestoneSelection?.discoverySource || null };

    // Preserve a previously verified pregame bound through evidence gaps.
    // This is provenance only, never permission to enter.
    const priorPregameMs=Number(prior?.pregameObservedAtMs||0);
    const priorPregameId=String(prior?.pregameMilestoneId||'');
    const retainedPregame=prior?.pregameObservationAccepted===true&&prior?.eventTicker===event&&priorPregameId
      &&Number.isSafeInteger(priorPregameMs)&&priorPregameMs>0&&priorPregameMs<=decisionNow()
      &&(!milestone||String(milestone.id)===priorPregameId)
      ?{pregameObservedAtMs:priorPregameMs,pregameMilestoneId:priorPregameId,
        pregameObservationAccepted:true,pregameProofObservedAtMs:prior.pregameProofObservedAtMs,
        sourceObservationAtMs:clockSourceObservationMs(prior),sportingStatus:prior.sportingStatus}:{};

    if (milestone) {
      // Restart-safe event identity: an old proven or bounded game cannot
      // silently migrate to a different provider game milestone.
      if((prior?.confirmed||prior?.phase==='BOUNDED'||prior?.phase==='SCHEDULE_LIVE')&&prior?.milestoneId
        &&String(prior.milestoneId)!==String(milestone.id))
        return makeConflict(event,decisionNow(),prior,'provider_milestone_changed',{
          ...milestoneMeta,occurrenceTimeMs,entryAuthorized:false});
      const liveRecord = await this.liveForMilestone(milestone.id, { forceFresh,clockPriority });
      liveError = liveRecord.error || null;
      const rawLive = liveRecord.value;
      const liveData = rawLive?.live_data || rawLive;
      liveClass = classifyLiveData(liveData);
      const liveObservedAtMs = Number(liveRecord.observedAtMs || 0);
      const expectedMilestoneId = String(milestone.id);
      if(!liveError&&liveObservedAtMs>0&&liveObservedAtMs<clockSourceObservationMs(prior)){
        // An old cached response or an out-of-order request cannot erase a
        // later sporting observation, even if this local check finished last.
        return expireGameClockAuthorization({...prior,lastCheckedAtMs:decisionNow()},event,decisionNow());
      }
      if (liveClass.milestoneId && liveClass.milestoneId !== expectedMilestoneId) {
        return makeConflict(event, decisionNow(), prior, 'official_live_data_milestone_mismatch', {
          ...milestoneMeta,
          occurrenceTimeMs,
          evidenceObservedAtMs: liveObservedAtMs,
          evidence: {
            liveData: liveClass,
            expectedMilestoneId,
            receivedMilestoneId: liveClass.milestoneId,
          },
        });
      }
      if (liveClass.classification !== 'unknown' && !liveClass.milestoneId) {
        liveIdentityProblem = 'missing_milestone_id';
      }
      const liveIdentityValid = liveClass.milestoneId === expectedMilestoneId;

      if (liveIdentityValid && liveClass.classification === 'final') {
        return makeTerminal(event, decisionNow(), prior, 'official_live_data_final', {
          ...milestoneMeta,
          occurrenceTimeMs,
          evidenceObservedAtMs: liveObservedAtMs,
          evidence: { liveData: liveClass },
        });
      }
      if (liveIdentityValid && liveClass.classification === 'pregame') {
        const pregameAt=boundedObservation(liveRecord,liveClass,'pregame',decisionNow());
        if(prior?.phase==='CONFLICT')return makeConflict(event,decisionNow(),prior,
          'persisted_conflict_requires_proven_start',{
            ...milestoneMeta,occurrenceTimeMs,
            evidenceObservedAtMs:pregameAt?liveObservedAtMs:null,
            evidence:{liveData:liveClass}});
        if ((prior?.confirmed||prior?.phase==='BOUNDED'||prior?.phase==='SCHEDULE_LIVE')&&pregameAt) {
          return makeConflict(event, decisionNow(), prior, 'official_pregame_after_confirmed_start', {
            ...milestoneMeta,
            occurrenceTimeMs,
            evidenceObservedAtMs: liveObservedAtMs,
            evidence: { liveData: liveClass },
          });
        }
        if(prior?.confirmed||prior?.phase==='BOUNDED'||prior?.phase==='SCHEDULE_LIVE'){
          return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
            authorizationReason:null,authorizationSource:null,
            liveStatus:liveClass.classification,liveDataDelayed:Boolean(liveClass.delayed),
            lastCheckedAtMs:decisionNow(),reason:'unaccepted_pregame_refresh_required'};
        }
        const preceding=String(prior?.pregameMilestoneId||'')===expectedMilestoneId
          ?Number(prior?.pregameObservedAtMs||0):0;
        return makeUnknown(event,decisionNow(),'official_live_data_pregame',{
          ...milestoneMeta,occurrenceTimeMs,evidenceObservedAtMs:liveObservedAtMs,
          pregameObservedAtMs:Math.max(pregameAt,preceding)||null,
          pregameMilestoneId:pregameAt||preceding?expectedMilestoneId:null,
          pregameObservationAccepted:Boolean(pregameAt||preceding),
          pregameProofObservedAtMs:pregameAt>=preceding&&pregameAt?liveObservedAtMs:prior?.pregameProofObservedAtMs||null,
          sourceObservationAtMs:pregameAt?liveObservedAtMs:clockSourceObservationMs(prior),
          sportingStatus:pregameAt?'pregame':prior?.sportingStatus||null,
          evidence:{liveData:liveClass,pregameProviderObservationAccepted:Boolean(pregameAt)},
        });
      }
      if (liveIdentityValid && liveClass.classification === 'conflict') {
        return makeConflict(event, decisionNow(), prior, 'official_live_data_conflict', {
          ...milestoneMeta,
          occurrenceTimeMs,
          evidenceObservedAtMs: liveObservedAtMs,
          evidence: { liveData: liveClass },
        });
      }
      if (liveIdentityValid && liveClass.classification === 'live') {
        const decisionAtMs=decisionNow();
        const liveFresh=Boolean(boundedObservation(liveRecord,liveClass,'live',decisionAtMs));
        const liveInfo={liveStatus:'live',liveDataDelayed:Boolean(liveClass.delayed),
          liveStatusObservedAtMs:liveObservedAtMs,observedAtMs:liveObservedAtMs,
          sourceObservationAtMs:liveObservedAtMs,sportingStatus:'live',
          evidenceObservedAtMs:liveObservedAtMs,entryAuthorized:liveFresh};
        const direct=extractOfficialSportingEvidence(liveRecord?.value,null,milestone);
        if (prior?.confirmed && Number(prior.actualStartMs)>0 && prior.actualStartConfidence==='proven') {
          // A new explicit contradicting start is not a silent correction.
          if(direct.actualStartMs && Math.abs(direct.actualStartMs-prior.actualStartMs)>1000)
            return makeConflict(event,decisionAtMs,prior,'conflicting_official_actual_starts',{
              ...milestoneMeta,occurrenceTimeMs,...liveInfo,entryAuthorized:false});
          return makeConfirmed(event,decisionAtMs,prior.actualStartMs,
            prior.source||'kalshi_game_stats',{
              ...milestoneMeta,occurrenceTimeMs,...liveInfo,
              actualStartMs:prior.actualStartMs,actualStartConfidence:'proven',
              actualStartEvidenceSource:prior.actualStartEvidenceSource,
              actualStartLastVerifiedMs:prior.actualStartLastVerifiedMs,
              scheduledStartMs:direct.scheduledStartMs||prior.scheduledStartMs,
              reason:liveFresh?'persisted_proven_start_plus_fresh_live':'persisted_start_live_status_stale',
            });
        }
        if(direct.actualStartMs && direct.actualStartConfidence==='proven'
          && direct.actualStartMs<=decisionAtMs+2000
          &&(prior?.phase!=='CONFLICT'||liveObservedAtMs>clockSourceObservationMs(prior))){
          if(prior?.phase==='BOUNDED'&&
            (direct.actualStartMs<Number(prior.boundedStartLowerMs)
              ||direct.actualStartMs>Number(prior.boundedStartUpperMs)))
            return makeConflict(event,decisionAtMs,prior,'actual_start_conflicts_with_status_bounds',{
              ...milestoneMeta,occurrenceTimeMs,...liveInfo,entryAuthorized:false});
          return makeConfirmed(event,decisionAtMs,direct.actualStartMs,direct.actualStartEvidenceSource,{
            ...milestoneMeta,occurrenceTimeMs,...liveInfo,
            actualStartMs:direct.actualStartMs,actualStartConfidence:'proven',
            actualStartEvidenceSource:direct.actualStartEvidenceSource,
            actualStartLastVerifiedMs:liveObservedAtMs,
            scheduledStartMs:direct.scheduledStartMs,firstActionAtMs:direct.firstActionAtMs,
            lateGame:direct.lateGame,remainingMs:direct.remainingMs,
          });
        }
        const statsRecord=allowGameStats?await this.statsForMilestone(milestone.id,{forceFresh,clockPriority}):null;
        statsError=statsRecord?.error||null;
        if(statsRecord&&liveFresh
          &&decisionNow()-liveObservedAtMs>GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs)
          onOptionalStatsExpiry?.();
        const proof=extractOfficialSportingEvidence(liveRecord?.value,statsRecord?.value,milestone);
        const statsIdentity=String(statsRecord?.value?.milestone_id||statsRecord?.value?.game_stats?.milestone_id||'');
        if(statsIdentity && statsIdentity!==expectedMilestoneId)
          return makeConflict(event,decisionAtMs,prior,'official_game_stats_milestone_mismatch',{
            ...milestoneMeta,occurrenceTimeMs,expectedMilestoneId,statsIdentity,
            ...liveInfo,entryAuthorized:false});
        if(!statsError && proof.actualStartMs && proof.actualStartConfidence==='proven'
          && proof.actualStartMs<=decisionAtMs+2000
          &&(prior?.phase!=='CONFLICT'
            ||Number(statsRecord?.observedAtMs||0)>clockSourceObservationMs(prior))){
          if(prior?.phase==='BOUNDED'&&
            (proof.actualStartMs<Number(prior.boundedStartLowerMs)
              ||proof.actualStartMs>Number(prior.boundedStartUpperMs)))
            return makeConflict(event,decisionAtMs,prior,'actual_start_conflicts_with_status_bounds',{
              ...milestoneMeta,occurrenceTimeMs,...liveInfo,entryAuthorized:false});
          return makeConfirmed(event,decisionAtMs,proof.actualStartMs,proof.actualStartEvidenceSource,{
            ...milestoneMeta,occurrenceTimeMs,...liveInfo,
            actualStartMs:proof.actualStartMs,actualStartConfidence:'proven',
            actualStartEvidenceSource:proof.actualStartEvidenceSource,
            actualStartLastVerifiedMs:Number(statsRecord.observedAtMs||0)||null,
            sourceObservationAtMs:Math.max(liveObservedAtMs,Number(statsRecord.observedAtMs||0)),
            scheduledStartMs:proof.scheduledStartMs,firstActionAtMs:proof.firstActionAtMs,
            lateGame:proof.lateGame,remainingMs:proof.remainingMs,
          });
        }
        // A previous CONFLICT cannot be cleared by weaker status alone. A
        // later authenticated explicit actual start (above) may resolve it.
        if(prior?.phase==='CONFLICT')return {...prior,entryAuthorized:false,
          evidenceObservedAtMs:null,authorizationReason:null,authorizationSource:null,
          lastCheckedAtMs:decisionAtMs,reason:'persisted_conflict_requires_proven_start'};
        // Only a positive whole-game provider lifecycle transition for the SAME
        // identified milestone may bound an unknown kickoff. An already-LIVE
        // observation with no earlier verified pregame is NOT sufficient.
        const lower=String(prior?.pregameMilestoneId||'')===expectedMilestoneId
          ?Number(prior?.boundedStartLowerMs||prior?.pregameObservedAtMs||0):0;
        const upper=prior?.phase==='BOUNDED'&&String(prior?.milestoneId||'')===expectedMilestoneId
          ?Number(prior.boundedStartUpperMs||0)
          :boundedObservation(liveRecord,liveClass,'live',decisionAtMs);
        const interval=lower>0&&upper>lower
          &&upper-lower<=GAME_CLOCK_AUTHORITY.boundedStartMaximumSpanMs
          &&(!prior?.boundedStartUpperMs||prior.phase==='BOUNDED');
        if(interval){
          return makeBounded(event,decisionAtMs,lower,upper,expectedMilestoneId,{
            ...milestoneMeta,...retainedPregame,occurrenceTimeMs,...liveInfo,
            entryAuthorized:liveFresh,actualStartMs:null,actualStartConfidence:'bounded',
            evidence:{liveData:liveClass,statusIntervalMs:upper-lower,
              source:'two_whole_game_provider_lifecycle_observations',
              gameStatsError:statsError,forceFresh:Boolean(forceFresh)},
            reason:liveFresh?'bounded_start_plus_fresh_live':'bounded_start_live_status_stale'});
        }
        // R36: the existing 12-minute pregame-status bracket is preferred,
        // as is a PROVEN actual start above. The provider's start_date is a
        // *scheduled* reference and is NOT mathematically the first possible
        // kickoff; trading age here is an explicitly estimated policy window.
        // Exact-event milestone identity plus FRESH whole-game LIVE status are
        // mandatory. No trades, publication timestamps or generic period start
        // are accepted as current sporting-status evidence.
        const scheduledAt=Number(proof.scheduledStartMs||0);
        // Same latency/age standard as the verified pregame->LIVE bracket.
        // A delayed provider response must not mint a fresh schedule authority.
        const liveObservationAccepted=Boolean(boundedObservation(
          liveRecord,liveClass,'live',decisionAtMs));
        const officialWholeGameLive=directWholeGameStatus(liveRecord.value)==='live';
        const withinReferenceAge=Number.isSafeInteger(scheduledAt)
          &&scheduledAt>=946684800000&&scheduledAt<=decisionAtMs
          &&decisionAtMs-scheduledAt<=GAME_CLOCK_AUTHORITY.scheduleReferenceMaximumAgeMs;
        if(prior?.phase==='SCHEDULE_LIVE'&&Number(prior.scheduledStartMs||0)>0
          &&scheduledAt>0&&Number(prior.scheduledStartMs)!==scheduledAt)
          return makeConflict(event,decisionAtMs,prior,'official_schedule_reference_changed',{
            ...milestoneMeta,occurrenceTimeMs,...liveInfo,entryAuthorized:false});
        // R38 candidate: historical absence/untrusted observations are not
        // a contradictory sporting fact. Preserve an actually VERIFIED
        // same-milestone pregame that occurred AFTER the schedule reference.
        // A wide pregame interval BEFORE scheduled start is not a conflict.
        const verifiedPregameAfterReference=lower>scheduledAt && scheduledAt>0;
        const referenceDecisionAtMs=decisionNow();
        const referenceStillFresh=Boolean(boundedObservation(liveRecord,liveClass,'live',referenceDecisionAtMs));
        if(liveFresh&&liveObservationAccepted&&referenceStillFresh&&officialWholeGameLive&&withinReferenceAge
          &&liveIdentityValid&&(!statsIdentity||statsIdentity===expectedMilestoneId)
          &&!verifiedPregameAfterReference
          &&prior?.phase!=='CONFLICT'){
          return makeScheduledLiveReference(event,decisionAtMs,scheduledAt,expectedMilestoneId,{
            ...milestoneMeta,...retainedPregame,occurrenceTimeMs,occurrenceConflict:false,...liveInfo,
            entryAuthorized:true,
            evidence:{liveData:liveClass,
              referenceTimeBasis:'official_milestone_start_date_not_actual_start',
              source:'matched_milestone_schedule_plus_fresh_whole_game_live',
              actualKickoffProven:false,gameStatsError:statsError},
            reason:'scheduled_reference_fresh_live_kickoff_unproven'});
        }
        if(prior?.phase==='SCHEDULE_LIVE'&&scheduledAt===Number(prior.scheduledStartMs)
          &&String(prior.milestoneId)===expectedMilestoneId&&!verifiedPregameAfterReference){
          return {...prior,...retainedPregame,...milestoneMeta,entryAuthorized:false,evidenceObservedAtMs:null,
            authorizationReason:null,authorizationSource:null,liveStatus:'live',
            liveDataDelayed:Boolean(liveClass.delayed),liveStatusObservedAtMs:liveObservedAtMs||null,
            lastCheckedAtMs:referenceDecisionAtMs,reason:'scheduled_reference_retained_live_refresh_required'};
        }
        return makeLiveUnknown(event,referenceDecisionAtMs,'official_live_without_actual_start',{
          ...milestoneMeta,...retainedPregame,occurrenceTimeMs,...liveInfo,
          pregameObservedAtMs:lower||null,
          pregameMilestoneId:lower?expectedMilestoneId:null,
          entryAuthorized:false,actualStartMs:null,actualStartConfidence:'unknown',
          firstActionAtMs:proof.firstActionAtMs,statsError,
          occurrenceConflict:Boolean(!occurrence.coherent||(occurrenceTimeMs&&occurrenceTimeMs>decisionAtMs)),
          evidence:{liveData:liveClass,forceFresh:Boolean(forceFresh)},
        });
      }

      if(prior?.phase==='SCHEDULE_LIVE'){
        return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
          authorizationReason:null,authorizationSource:null,
          liveStatus:liveClass?.classification||'unknown',liveDataDelayed:Boolean(liveClass?.delayed),
          liveStatusObservedAtMs:liveObservedAtMs||null,lastCheckedAtMs:decisionNow(),
          reason:'scheduled_reference_retained_without_fresh_positive_live_status'};
      }
      if(prior?.phase==='BOUNDED'){
        return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
          authorizationReason:null,authorizationSource:null,
          liveStatus:liveClass?.classification||'unknown',liveDataDelayed:Boolean(liveClass?.delayed),
          liveStatusObservedAtMs:liveObservedAtMs||null,lastCheckedAtMs:decisionNow(),
          reason:'bounded_start_retained_without_fresh_positive_live_status'};
      }
      if(prior?.confirmed && prior.actualStartConfidence==='proven' && Number(prior.actualStartMs)>0){
        return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
          authorizationReason:null,authorizationSource:null,
          liveStatus:liveClass?.classification||'unknown',liveDataDelayed:Boolean(liveClass?.delayed),
          liveStatusObservedAtMs:liveObservedAtMs||null,lastCheckedAtMs:decisionNow(),
          reason:'proven_start_retained_without_fresh_positive_live_status'};
      }
      const statsRecord = allowGameStats
        ? await this.statsForMilestone(milestone.id, { forceFresh,clockPriority })
        : null;
      statsError = statsRecord?.error || null;
      pbpCount = countPbpEvents(statsRecord?.value);
      if (pbpCount > 0 && prior?.phase !== 'CONFLICT') {
        const observedNow=Number(statsRecord?.observedAtMs||0)||decisionNow();
        // PBP activity is evidence that play occurred, not its actual start or
        // current LIVE permission. Never describe trade activity as authority.
        return makeLiveUnknown(event,decisionNow(),'pbp_count_not_an_actual_start',{
          ...milestoneMeta,...retainedPregame,occurrenceTimeMs,observedAtMs:observedNow,
          evidenceObservedAtMs:null,
          evidence:{liveData:liveClass,pbpEventCount:pbpCount,forceFresh:Boolean(forceFresh),
            gameStatsObservedAtMs:observedNow,actualStartProven:false}});
      }
    }

    const currentNow = decisionNow();
    // The market occurrence field is known to be fallible. Disagreement
    // between sibling markets is therefore a conflict only when stronger
    // milestone evidence could not settle the question. Strong official live
    // data/PBP above is allowed to win, while the mismatch remains telemetry.
    if (!occurrence.coherent) {
      return makeConflict(event, currentNow, prior, 'sibling_occurrence_mismatch', {
        ...milestoneMeta,
        occurrenceTimeMs,
        evidence: {
          liveData: liveClass,
          liveError,
          liveIdentityProblem,
          pbpEventCount: pbpCount,
          statsError,
          milestoneReason: milestoneSelection?.reason || null,
          occurrenceTimes: occurrence.values.slice(0, 8),
        },
      });
    }

    // A CONFLICT cannot be cleared by the weaker occurrence/activity fallback
    // or by an API outage. Only explicit strong official evidence above may
    // resolve it; otherwise we keep failing closed across scans/restarts.
    if (prior?.phase === 'CONFLICT') {
      return {
        ...prior,
        entryAuthorized: false,
        evidenceObservedAtMs: null,
        authorizationReason: null,
        authorizationSource: null,
        lastCheckedAtMs: currentNow,
        occurrenceTimeMs: occurrenceTimeMs || prior.occurrenceTimeMs || null,
        milestoneId: milestoneMeta.milestoneId || prior.milestoneId || null,
        milestoneType: milestoneMeta.milestoneType || prior.milestoneType || null,
        milestoneStartMs: milestoneMeta.milestoneStartMs || prior.milestoneStartMs || null,
        evidence: {
          ...(prior.evidence || {}),
          currentLiveData: liveClass,
          liveError,
          liveIdentityProblem,
          statsError,
          milestoneReason: milestoneSelection?.reason || null,
          retainedConflictAcrossEvidenceGap: true,
        },
        reason: 'persisted_conflict_retained',
      };
    }

    if(prior?.phase==='SCHEDULE_LIVE'){
      // Retain schedule provenance across a missing milestone, but never its
      // old short-lived entry authorization. A future refresh must reprove it.
      return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
        authorizationReason:null,authorizationSource:null,lastCheckedAtMs:currentNow,
        reason:'scheduled_reference_retained_pending_live_refresh'};
    }
    if(prior?.phase==='BOUNDED'){
      // An unassociated provider outage cannot clear a valid historical
      // transition, but also cannot authorize fresh capital. FINAL and
      // CONFLICT were already handled above.
      return {...prior,entryAuthorized:false,evidenceObservedAtMs:null,
        authorizationReason:null,authorizationSource:null,lastCheckedAtMs:currentNow,
        reason:'bounded_start_evidence_retained_pending_live_refresh'};
    }
    if (prior?.confirmed) {
      if (prior.source === 'observed_market_activity') {
        const freshObservedActivity = Boolean(allowObservedActivityClock && broadLive(quotes) && freshTradeActivity(quotes, currentNow));
        const minimumAge = Math.max(0, Number(minimumElapsedMs) || 0);
        const age = currentNow - Number(prior.startTimeMs || 0);
        if (freshObservedActivity && age >= minimumAge) {
          return makeLiveUnknown(event, currentNow, 'observed_market_activity_not_a_start', {
            ...milestoneMeta,
            occurrenceTimeMs,
            occurrenceConflict: Boolean(!occurrence.coherent || (occurrenceTimeMs && occurrenceTimeMs > currentNow)),
            observedAtMs: prior.observedAtMs || prior.startTimeMs,
            evidenceObservedAtMs: currentNow,
            authorizationReason: 'observed_market_activity_aged_plus_fresh_exact_trade',
            authorizationSource: 'observed_market_activity_fresh_exact_trade',
            reason: 'observed_market_activity_reauthorized',
            observedActivityStartMs: Number(prior.observedActivityStartMs || prior.startTimeMs),
            observedActivityLastEvidenceMs: currentNow,
            observedActivityEvidenceCount: Math.max(GAME_CLOCK_AUTHORITY.observedActivityMinimumObservations, Number(prior.observedActivityEvidenceCount || 0) + 1),
            evidence: { ...(prior.evidence || {}), sharedLiveSimulationAuthority:true, freshTradeActivity:true, minimumElapsedMs:minimumAge, observedAgeMs:age },
          });
        }
        return {
          ...prior,
          entryAuthorized:false,
          evidenceObservedAtMs:null,
          authorizationReason:null,
          authorizationSource:null,
          lastCheckedAtMs:currentNow,
          reason:allowObservedActivityClock ? 'observed_market_activity_waiting_for_fresh_or_minimum_age' : 'observed_market_activity_not_enabled',
        };
      }
      if (prior.source === 'occurrence_passed' && occurrenceTimeMs && occurrenceTimeMs > currentNow) {
        return makeConflict(event, currentNow, prior, 'fallback_occurrence_moved_future', {
          ...milestoneMeta,
          occurrenceTimeMs,
          evidence: {
            liveData: liveClass,
            liveError,
            liveIdentityProblem,
            statsError,
            milestoneReason: milestoneSelection?.reason || null,
          },
        });
      }
      const freshFallback = Boolean(
        occurrenceTimeMs
        && occurrenceTimeMs <= currentNow
        && broadLive(quotes)
        && freshTradeActivity(quotes, currentNow),
      );
      if (freshFallback) {
        return makeConfirmed(event, currentNow, prior.startTimeMs, prior.source || 'occurrence_passed', {
          ...milestoneMeta,
          occurrenceTimeMs,
          occurrenceConflict: false,
          observedAtMs: prior.observedAtMs || prior.startTimeMs,
          evidenceObservedAtMs: currentNow,
          authorizationReason: 'fresh_occurrence_passed_plus_trade_activity',
          authorizationSource: 'occurrence_passed_fresh_trade_activity',
          reason: 'persisted_start_reauthorized_by_fresh_occurrence_activity',
          evidence: {
            ...(prior.evidence || {}),
            currentLiveData: liveClass,
            liveError,
            liveIdentityProblem,
            statsError,
            milestoneReason: milestoneSelection?.reason || null,
            freshTradeActivity: true,
          },
        });
      }
      // Persist the lower-bound start as provenance, but never persist permission
      // to create new exposure through an API/evidence gap. Pre-execution must
      // obtain fresh authorization again.
      return {
        ...prior,
        entryAuthorized: false,
        evidenceObservedAtMs: null,
        authorizationReason: null,
        authorizationSource: null,
        lastCheckedAtMs: currentNow,
        occurrenceTimeMs: occurrenceTimeMs || prior.occurrenceTimeMs || null,
        milestoneId: milestoneMeta.milestoneId || prior.milestoneId || null,
        milestoneType: milestoneMeta.milestoneType || prior.milestoneType || null,
        milestoneStartMs: milestoneMeta.milestoneStartMs || prior.milestoneStartMs || null,
        evidence: {
          ...(prior.evidence || {}),
          currentLiveData: liveClass,
          liveError,
          liveIdentityProblem,
          statsError,
          milestoneReason: milestoneSelection?.reason || null,
          retainedAcrossEvidenceGap: true,
        },
        reason: 'persisted_confirmed_start_retained',
      };
    }

    // GCA2-R3: provider milestone coverage is incomplete for several live
    // sports families. Preserve one conservative observed-activity lower bound
    // for BOTH LIVE and SIMULATION so the strategic entry-authority plane is
    // mode invariant. This is still fail-closed: repeated fresh exact-trade
    // observations must remain continuous, the lower bound must age through the
    // configured minimum-game-time window, and official pregame/conflict/final
    // evidence above always wins. Broker execution remains mode-specific later.
    if (allowObservedActivityClock && occurrence.coherent && (!occurrenceTimeMs || occurrenceTimeMs > currentNow) && broadLive(quotes)) {
      const freshActivity = freshTradeActivity(quotes, currentNow);
      const priorStart = Number(prior?.observedActivityStartMs || 0);
      const priorLast = Number(prior?.observedActivityLastEvidenceMs || 0);
      const gap = priorLast > 0 ? currentNow - priorLast : 0;
      const continuityBroken = priorLast > 0 && gap > GAME_CLOCK_AUTHORITY.observedActivityMaxGapMs;
      const start = freshActivity
        ? ((!priorStart || continuityBroken) ? currentNow : priorStart)
        : priorStart;
      const observations = freshActivity
        ? ((!priorStart || continuityBroken) ? 1 : Math.max(1, Number(prior?.observedActivityEvidenceCount || 0) + 1))
        : Math.max(0, Number(prior?.observedActivityEvidenceCount || 0));
      const lastEvidence = freshActivity ? currentNow : (priorLast || null);
      const minimumAge = Math.max(0, Number(minimumElapsedMs) || 0);
      const observedAge = start > 0 ? Math.max(0, currentNow - start) : 0;
      const aged = start > 0 && observedAge >= minimumAge && observations >= GAME_CLOCK_AUTHORITY.observedActivityMinimumObservations;
      if (freshActivity && aged) {
        return makeLiveUnknown(event, currentNow, 'observed_market_activity_not_a_start', {
          ...milestoneMeta,...retainedPregame,
          occurrenceTimeMs,
          occurrenceConflict:Boolean(occurrenceTimeMs && occurrenceTimeMs > currentNow),
          observedAtMs:start,
          evidenceObservedAtMs:currentNow,
          authorizationReason:'observed_market_activity_aged_plus_fresh_exact_trade',
          authorizationSource:'observed_market_activity_fresh_exact_trade',
          reason:'observed_market_activity_authorized',
          observedActivityStartMs:start,
          observedActivityLastEvidenceMs:lastEvidence,
          observedActivityEvidenceCount:observations,
          evidence:{liveData:liveClass,liveError,statsError,milestoneReason:milestoneSelection?.reason||null,milestoneError:milestoneSelection?.error||null,sharedLiveSimulationAuthority:true,freshTradeActivity:true,observedAgeMs:observedAge,minimumElapsedMs:minimumAge,continuityBroken},
        });
      }
      return makeUnknown(event, currentNow, freshActivity ? 'observed_market_activity_aging' : 'observed_market_activity_waiting_for_fresh_trade', {
        ...milestoneMeta,...retainedPregame,
        occurrenceTimeMs,
        observedActivityStartMs:start || null,
        observedActivityLastEvidenceMs:lastEvidence,
        observedActivityEvidenceCount:observations,
        evidence:{liveData:liveClass,liveError,statsError,milestoneReason:milestoneSelection?.reason||null,milestoneError:milestoneSelection?.error||null,sharedLiveSimulationAuthority:true,freshTradeActivity:freshActivity,observedAgeMs:observedAge,minimumElapsedMs:minimumAge,continuityBroken},
      });
    }

    if (occurrenceTimeMs && occurrenceTimeMs <= currentNow && broadLive(quotes)) {
      return makeLiveUnknown(event,currentNow,'occurrence_passed_not_a_start',{
        ...milestoneMeta,...retainedPregame,occurrenceTimeMs,evidenceObservedAtMs:null,
        evidence:{liveData:liveClass,liveError,liveIdentityProblem,statsError,
          milestoneReason:milestoneSelection?.reason||null,broadLive:true,
          actualStartProven:false,marketActivityAuthorizesEntry:false}});
    }

    let reason = !occurrenceTimeMs
      ? 'missing_occurrence_no_strong_live_evidence'
      : occurrenceTimeMs > currentNow && broadLive(quotes)
        ? 'activity_only_future_occurrence_blocked'
        : occurrenceTimeMs > currentNow
          ? 'future_occurrence_no_strong_live_evidence'
          : 'no_live_evidence_after_occurrence';
    if (liveIdentityProblem === 'missing_milestone_id') reason = 'live_data_identity_missing_no_other_authority';
    return makeUnknown(event, currentNow, reason, {
      ...milestoneMeta,...retainedPregame,
      occurrenceTimeMs,
      evidence: {
        liveData: liveClass,
        liveError,
        liveIdentityProblem,
        pbpEventCount: pbpCount,
        statsError,
        milestoneReason: milestoneSelection?.reason || null,
        milestoneError: milestoneSelection?.error || null,
        broadLive: broadLive(quotes),
      },
    });
  }

  async resolveBatch(quotes = [], priorStates = new Map(), now = this.now(), { gameStatsEventTickers = new Set(), allowObservedActivityClock = false, minimumElapsedMs = 0 } = {}) {
    const groups = new Map();
    for (const q of quotes) {
      const event = String(q?.eventTicker || q?.ticker || '');
      if (!event) continue;
      if (!groups.has(event)) groups.set(event, []);
      groups.get(event).push(q);
    }
    const events = [...groups.entries()];
    const rows = await concurrentMap(events, GAME_CLOCK_AUTHORITY.maxConcurrency, async ([eventTicker, eventQuotes]) => {
      const prior = priorStates instanceof Map ? priorStates.get(eventTicker) : priorStates?.[eventTicker];
      const allowGameStats = gameStatsEventTickers instanceof Set && gameStatsEventTickers.has(eventTicker);
      const state = await this.resolveEvent({ eventTicker, quotes: eventQuotes, priorState: prior, now, allowGameStats, allowObservedActivityClock, minimumElapsedMs });
      await this.auditTransition(eventTicker, prior, state, eventQuotes).catch(() => {});
      return [eventTicker, state];
    });
    return new Map(rows);
  }

  async auditTransition(eventTicker, priorRaw, nextRaw, quotes = []) {
    const prior = normalizeGameClockState(priorRaw, eventTicker);
    const next = normalizeGameClockState(nextRaw, eventTicker) || nextRaw;
    const meaningful = !prior
      || prior.phase !== next.phase
      || prior.source !== next.source
      || prior.reason !== next.reason
      || Boolean(prior.entryAuthorized) !== Boolean(next.entryAuthorized)
      || Boolean(prior.occurrenceConflict) !== Boolean(next.occurrenceConflict);
    if (!meaningful) return;
    const data = {
      eventTicker,
      tickers: quotes.map((q) => q.ticker).slice(0, 8),
      phase: next.phase,
      source: next.source,
      reason: next.reason,
      startTimeMs: next.startTimeMs,
      boundedStartLowerMs:next.boundedStartLowerMs||null,
      boundedStartUpperMs:next.boundedStartUpperMs||null,
      entryAuthorized: Boolean(next.entryAuthorized),
      evidenceObservedAtMs: next.evidenceObservedAtMs || null,
      occurrenceTimeMs: next.occurrenceTimeMs,
      occurrenceConflict: Boolean(next.occurrenceConflict),
      milestoneId: next.milestoneId,
      milestoneType: next.milestoneType,
      milestoneDiscoverySource: next.milestoneDiscoverySource || null,
      milestoneStartMs: next.milestoneStartMs || null,
      milestoneEndMs: next.milestoneEndMs || null,
      authorizationReason: next.authorizationReason || null,
      authorizationSource: next.authorizationSource || null,
    };
    if(next.phase==='BOUNDED')await this.audit('game_clock_authority_bounded',data);
    else if (next.phase === 'CONFIRMED') await this.audit('game_clock_authority_confirmed', data);
    else if (next.phase === 'CONFLICT') await this.audit('game_clock_authority_conflict', data);
    else if (next.phase === 'FINAL') await this.audit('game_clock_authority_final', data);
    else if (next.reason === 'activity_only_future_occurrence_blocked') await this.audit('game_clock_activity_only_blocked', data);
    else await this.audit('game_clock_authority_waiting', data);
  }
}
