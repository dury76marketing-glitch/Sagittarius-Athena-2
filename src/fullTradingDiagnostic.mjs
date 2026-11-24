import { BUILD_INFO } from './authority.mjs';
import { RELEASE } from './config.mjs';
import { GOLDEN_SAINTS } from './goldenSaintCards.mjs';

export const FULL_TRADING_DIAGNOSTIC_MAX_BYTES = 3_000_000;
export const FULL_TRADING_DIAGNOSTIC_WINDOW_MS = 60 * 60 * 1000;

const SECRET = /key|secret|password|token|credential|pem|private/i;
const SETTING_KEYS = [
  'mode','engineActive','liveArmed','systemName','ownerId','resetTimestampMs',
  'maxEntriesPerTrade','hunterCooldownMinutes','eventCooldownMinutes','maxPositions',
  'infinityBreakMaximumBookAgeMs','athenaExclamationStarlightTriggerCents',
  'athenaExclamationEnabled','athenaExclamationMultiply','athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents',
  'crashRecoveryHunterEnabled','crashRecoveryHunterLinkEnabled','starlightExtinctionRealTradeEnabled',
  'crashRecoveryHunterObservationMinutes','crashRecoveryHunterMinCrashCents','crashRecoveryHunterMinReboundCents','crashRecoveryHunterMinUpwardTicks',
  'crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents','crashRecoveryStakeCents',
  'galacticExplosionEnabled','andromedaThunderWaveEnabled','andromedaThunderWaveLevel',
  'auroraDamageControlPercent','lightningPlasmaEnabled','sagittariusArrowEnabled',
  'scarletNeedleCapitalEnabled','pegasusRyuSeiKenCapitalEnabled','greatHornEnabled','recoveryHunterEnabled',
];

function safeSettings(settings = {}) {
  const out = [];
  for (const name of SETTING_KEYS) {
    if (!(name in settings)) continue;
    out.push({ settingName: name, effectiveValue: settings[name], source: 'runtime', scope: 'host', lastUpdatedAt: null });
  }
  for (const [name, value] of Object.entries(settings)) {
    if (SECRET.test(name) || SETTING_KEYS.includes(name)) continue;
    if (value == null || ['string','number','boolean'].includes(typeof value))
      out.push({ settingName: name, effectiveValue: value, source: 'runtime', scope: 'host', lastUpdatedAt: null });
  }
  // Show each sanitized R17 persisted card control without returning nested
  // objects, credentials, or an invented historical decision-time setting.
  for(const saint of GOLDEN_SAINTS){
    const card=settings?.goldenSaints?.[saint];
    if(!card||typeof card!=='object'||Array.isArray(card))continue;
    for(const [key,value] of Object.entries(card)){
      if(SECRET.test(key)||!['boolean','number'].includes(typeof value)||!Number.isFinite(Number(value)))continue;
      out.push({settingName:`goldenSaints.${saint}.${key}`,effectiveValue:value,source:'runtime',scope:'R17_OPERATOR_CARD',lastUpdatedAt:null});
    }
  }
  return out;
}

function age(now, at) {
  const n = Number(at || 0);
  return n > 0 ? now - n : null;
}

export function buildFullTradingDiagnostic(engine, now = Date.now(), nativeFunnel=null) {
  const settings = engine?.settings || {};
  const windowStart = now - FULL_TRADING_DIAGNOSTIC_WINDOW_MS;
  const watches = [...(engine?.starlightRecoveryWatches?.values?.() || [])];
  const durable = watches.map(w => ({
    authorizationId: w.authorizationId, ticker: w.ticker, eventTicker: w.eventTicker,
    status: w.status, parentEntryId: w.parentEntryId, parentConcept: w.parentConcept,
    lastSignalReason: w.lastSignalReason, lastAttemptReason: w.lastAttemptReason,
    lastAttemptStage: w.lastAttemptStage, attempts: w.attempts,
    lastBidCents: w.lastBidCents, lastAskCents: w.lastAskCents,
    armedAtMs: w.armedAtMs, updatedAtMs: w.updatedAtMs,
    recoveredChildId: w.recoveredChildId || null,
  }));
  const pipeline = [...(engine?.strategy?.entryPipelineEvents || [])]
    .filter(e => Number(e?.atMs || 0) >= windowStart)
    .slice(-400);
  const byReason = {};
  for (const e of pipeline) {
    const key = `${e.stage || 'unknown'}:${e.status || e.reason || 'unknown'}`;
    byReason[key] = (byReason[key] || 0) + 1;
  }
  const linked=engine?.tradingFunnelSnapshot?.()||null;
  // The record detail slice is smaller than retained history. Use the explicit
  // full-retained-map result; no absence in the detail slice can imply success.
  const firstObservedRefusal=linked?.earliestRetainedRefusal||null;
  const choke = {
    engineProcessing: engine?.health?.operational?.newEntriesAllowed !== false && engine?.health?.degraded !== true,
    activeStages: [...new Set(pipeline.map(e => e.stage).filter(Boolean))],
    firstMeaningfulReduction:firstObservedRefusal?{...firstObservedRefusal,basis:'earliest_retained_observed_refusal',historyComplete:false}:null,
    linkedFunnelAvailable:Boolean(linked),nativeFunnelStatus:nativeFunnel?.status||'NOT_COLLECTED',
    configurationControlled: ['shadow_event_lifetime_cap','maxEntriesPerTrade','goldenSaints_card_settings'],
    safetyControlled: ['ticker_lock', 'market_or_book_invalid', 'fee_budget_exhausts_aurora_loss_envelope', 'live_fill_unconfirmed'],
    suspectedDefects: [],
    insufficientEvidence: ['broker_fill_not_in_memory','historical_setting_at_decision_time',...(nativeFunnel?.status==='AVAILABLE'?[]:['r17_native_evidence_unavailable'])],
    recentCandidateBlocks: pipeline.filter(e => e.status === 'BLOCKED').slice(-40),
    byReason,
    r17Runtime:engine?.r17?.snapshot?.()||null,
    r17DecisionTraceAvailable:typeof engine?.r17?.decisionTraceSnapshot==='function',
    note: 'This legacy pipeline does not contain R17 Golden Saint entry decisions. R17 dedicated decision traces are exported separately. These are bounded evaluations, not matched SIM/LIVE tapes or independent opportunities.',
  };
  const r17=engine?.r17?.snapshot?.()||null;
  const r17DecisionTraces=engine?.r17?.decisionTraceSnapshot?.()||{
    version:'R17-DECISION-TRACE-1',status:'UNAVAILABLE',events:[]};
  const regular=GOLDEN_SAINTS.slice(0,10);
  const recoveries=GOLDEN_SAINTS.slice(10);
  const activeCards=GOLDEN_SAINTS.filter(name=>settings?.goldenSaints?.[name]?.enabled===true);
  // Counts in r17.stats are process-local cumulative counters, NOT durable
  // counts of active watches. This synchronous export must never invent a
  // parent proof or infer zero parents from a retired Starlight cache.
  const athena = {
    question:'What happened after a verified Athena loss in R17?',
    answer:r17?'R17 authorizes the ten enabled regular cards via durable PostgreSQL watches. The in-memory retired Starlight watch count is NOT the active R17 parent count.':'R17 runtime snapshot unavailable; no Athena loss count is inferred.',
    regularAttacks:regular,recoveries,activeCards,
    r17Runtime:r17,verifiedAthenaStopsInExportWindow:null,
    r17DurableWatchRows:'NOT_INCLUDED_IN_SYNCHRONOUS_EXPORT',
    parentEvidence:'Authoritative Athena loss proofs and R17 watch lineage live in PostgreSQL; inspect them with a scoped read-only query.',
    notEligible:'A profitable or unverified Athena close never arms a Golden Saint capital attack.'
  };
  const locks = {
    tickerLock: {
      rule: 'R16: Galactic ON permits distinct authenticated opportunity intents for the same attack/ticker, subject to durable event/global caps, cash and exact order safeguards. Galactic OFF retains original same-attack ticker restrictions.',
      currentBlocks: pipeline.filter(e => e.reason === 'ticker_lock').slice(-30),
      suspectedStale: false,
      note: 'A lock held by an open shadow is expected. This export does not release locks.',
    },
    eventCap: {
      configuredMaximum: Number(settings.maxEntriesPerTrade ?? 1),
      rule: 'shadow_event_lifetime_cap counts non-rejected shadow rows on the event for the epoch. Closed rows count. Rejected rows do not.',
      sharedOrIndependent: settings.galacticExplosionEnabled === true ? 'per attack plus immutable opportunity identity when Galactic ON' : 'shared across attacks',
      currentBlocks: pipeline.filter(e => e.reason === 'shadow_event_lifetime_cap').slice(-30),
      refusalCorrectIfCountAtOrAboveMaximum: true,
    },
  };
  const market = pipeline.filter(e => e.yesBid != null || e.bookInvalid != null || e.reason).slice(-80).map(e => ({
    atMs: e.atMs, ticker: e.ticker, stage: e.stage, status: e.status, reason: e.reason,
    yesBid: e.yesBid ?? null, yesAsk: e.yesAsk ?? null, bookInvalid: e.bookInvalid ?? null,
    quoteAgeMs: e.quoteAgeMs ?? null, operatorBookAgeMs: Number(settings.infinityBreakMaximumBookAgeMs ?? 0),
  }));
  const hunters = [...(engine?.hunters?.values?.() || engine?.openHunters || [])];
  const arrowRows = hunters.filter(h => String(h.conceptName) === 'Sagittarius Arrow Recovery').slice(0, 50);
  const broker = {
    note: 'A pending LIVE order is not a confirmed funded open. A missing receipt is not proof that dispatch did not occur.',
    capitalOpensInWindow: pipeline.filter(e => e.status === 'OPENED' || e.stage === 'OPENED').slice(-40),
    pendingNotFunded: durable.filter(w => w.lastAttemptReason === 'live_fill_unconfirmed'),
    arrowLinkPriceComparisons: arrowRows.length ? arrowRows.map(arrow => {
      const parent = hunters.find(p => String(p.id) === String(arrow.sourceTradeId));
      const parentPrice = parent ? Number(parent.entryPriceCents) : null;
      const arrowPrice = Number(arrow.entryPriceCents);
      return {
        parentEntryId: arrow.sourceTradeId || null,
        arrowEntryId: arrow.id,
        watchId: arrow.entryConfig?.sagittariusArrow?.watchId || null,
        ticker: arrow.ticker,
        parentConfirmedFillPriceCents: Number.isFinite(parentPrice) ? parentPrice : 'UNAVAILABLE',
        arrowLimitPriceCents: arrow.entryConfig?.limitPriceCents ?? 'UNAVAILABLE',
        arrowConfirmedFillPriceCents: Number.isFinite(arrowPrice) ? arrowPrice : 'UNAVAILABLE',
        priceDeltaCents: Number.isFinite(parentPrice) && Number.isFinite(arrowPrice) ? arrowPrice - parentPrice : 'UNAVAILABLE',
        parentFillAtMs: parent?.openedAtMs ?? 'UNAVAILABLE',
        arrowDispatchAtMs: arrow.openedAtMs ?? 'UNAVAILABLE',
        latencyMs: parent?.openedAtMs && arrow.openedAtMs ? Number(arrow.openedAtMs) - Number(parent.openedAtMs) : 'UNAVAILABLE',
        matchingPolicy: 'NO_WORSE',
        decisionReason: Number.isFinite(parentPrice) && Number.isFinite(arrowPrice) && arrowPrice > parentPrice ? 'worse_than_parent' : 'within_parent_ceiling',
      };
    }) : 'UNAVAILABLE',
  };
  const chains={
    architecture:'R17-TWELVE-GOLDEN-SAINTS',
    upstream:'Original scanners and Athena Exclamation preserved; a VERIFIED Athena shadow loss arms independent regular watches.',
    regularAttacks:regular,
    recovery1:{saint:'Aquarius',parent:'ANY ONE regular capital attack with verified reconciled net loss'},
    recovery2:{saint:'Pisces',parent:'CORRESPONDING Aquarius with verified reconciled net loss'},
    activeCards,processLocalRuntime:r17,
    persistedWatches:'NOT_OBSERVED_IN_THIS_SYNCHRONOUS_EXPORT',
    verifiedLossLineage:'REQUIRES_POSTGRESQL_READ',
    retiredChains:'NO_NEW_CAPITAL_ENTRY_AUTHORITY; historical capital exits/protection must continue',
    note:'LIVE broker admission, balance, book, fees, LINK, parent proof and fill reconciliation remain mandatory.'
  };
  const contexts=pipeline.filter(e=>e.decisionContext?.settingsHash&&e.decisionContext?.marketEventId);
  const settingsSnapshots=[...(engine?.strategy?.entryPipelineSettingsSnapshots?.values?.()||[])].slice(-32);
  const liveness=engine?.tradingLiveness?.snapshot?.({history:true})||{state:'LIVENESS_DEGRADED',reason:'runtime_observation_unavailable',coverage:{fullHistory:false}};
  const parity = { status: 'COMPARISON_UNAVAILABLE_MISSING_MATCHED_EVENT_DATA',
    observedDecisionContexts:contexts.length,matchingRequired:['canonical market event or identical replay frame','equivalent operator card','equivalent verified parent authority','same market-clock and freshness evidence'],
    note:'A local trace is evidence, not proof of SIM/LIVE parity. No comparison is fabricated from unrelated opportunities.' };
  const cached=engine?.stateSnapshotCache?.accountExecutionSummary;
  const scoped=cached?.scope&&['systemName','ownerId','mode'].every(k=>String(cached.scope[k])===String(settings[k]))
    &&Number(cached.scope.resetTimestampMs||0)===Number(settings.resetTimestampMs||0)
    &&Number(cached.scope.dashboardStartMs||0)===Number((settings.mode==='LIVE'?settings.liveDashboardStartMs:settings.simulationDashboardStartMs)||0);
  const financeKeys=['realizedCents','knownRealizedCents','closedRealizedCents','partialRealizedCents','unrealizedCents','knownUnrealizedCents','feesCents','knownFeesCents',
    'financialComplete','feesComplete','valuationComplete','unreconciled','missingValuations','pending','open','closed','wins','losses','scratches','winRate',
    'dayRealizedCents','weekRealizedCents','monthRealizedCents','yearRealizedCents','periodsComplete'];
  const finance=scoped?{status:'CACHED_AUTHORITATIVE_REPORT',scope:cached.scope,asOfMs:cached.asOfMs??null,
    ageMs:age(now,cached.asOfMs),reportingVersion:cached.reportingVersion,
    values:Object.fromEntries(financeKeys.map(k=>[k,k==='feesCents'
      ?cached.feesComplete===true&&cached.knownFeesCents!=null&&Number.isFinite(Number(cached.knownFeesCents))?Number(cached.knownFeesCents):null
      :cached[k]??null])),
    note:'Known subtotals do not complete unresolved economics; null is not zero. Cache age is explicit; this export performs no financial SQL.'}
    :{status:'UNAVAILABLE',reason:'no_completed_financial_snapshot_in_current_scope',values:null};
  const coverage = {
    windowStartMs: windowStart, windowEndMs: now,
    pipelineEventsUsed: pipeline.length, watchesUsed: durable.length,
    pipelineFirstAtMs:pipeline[0]?.atMs??null,pipelineLastAtMs:pipeline.at(-1)?.atMs??null,
    historicalSettingAtDecision:contexts.length?'BOUNDED_DECISION_CONTEXTS':'NOT_AVAILABLE',
    decisionContexts:contexts.length,r17DecisionTraceEvents:r17DecisionTraces.events.length,
    r17MatchedSimLiveTape:false,settingsSnapshots:settingsSnapshots.length,maximumSettingsSnapshots:32,
    liveness:liveness.coverage||null,financialAsOfMs:finance.asOfMs??null,
    sampled: true, fullHistory: false,
  };
  const manifest = {
    kind: 'FULL-TRADING-DIAGNOSTIC',
    release: RELEASE,
    build: BUILD_INFO?.id || RELEASE,
    exportedAtMs: now,
    mode: settings.mode || null,
    systemName:settings.systemName||null,ownerId:settings.ownerId||null,resetEpoch:Number(settings.resetTimestampMs||0),
    sourceSha256:BUILD_INFO?.sourceSha256||null,railwayCommit:BUILD_INFO?.railwayCommit||null,
    maxBytes: FULL_TRADING_DIAGNOSTIC_MAX_BYTES,
    readOnly: true,
    tradingUnchanged: true,
  };
  const modeAuth = {
    version: 'R17-MODE-AUTHORIZATION-EVIDENCE-1',
    exportedAtMs: now,
    mode: settings.mode || null,
    liveArmed: settings.liveArmed === true,
    liveOwnerAuthorized: settings.liveOwnerAuthorized === true,
    engineActive: settings.engineActive === true,
    lastLiveModeAttempt: engine?.health?.lastLiveModeAttempt || null,
    lastReconciliationReason: engine?.health?.lastReconciliationReason || null,
    lastReconciliationDetails: engine?.health?.lastReconciliationDetails || null,
    fundedOrphans: engine?.liveFinancialOrphans
      ? {count:Number(engine.liveFinancialOrphans.count||0),
         flatOrphanCount:Number(engine.liveFinancialOrphans.flatOrphanCount||0),
         status:String(engine.liveFinancialOrphans.status||'not_observed')}
      : null,
    controlStateDiagnostics: engine?.health?.controlStateDiagnostics || null,
    liveArmHealthDenials: typeof engine?.liveArmHealthDenials === 'function'
      ? engine.liveArmHealthDenials()
      : null,
    isLiveReady: typeof engine?.isLiveReady === 'function' ? engine.isLiveReady() : null,
    // A healthy dashboard aggregate is not an authorization, and a degraded
    // optional worker must not masquerade as a GOLD SAINT execution veto.
    qualifiedGoldSaintAdmission: typeof engine?.goldSaintLiveAdmission === 'function'
      ? engine.goldSaintLiveAdmission() : null,
    note: 'Records separate aggregate health versus current scoped qualified Gold Saint admission; neither sends broker orders.',
  };
  const files = {
    'diagnostic-manifest.json': manifest,
    'effective-settings.json': safeSettings(settings),
    'live-mode-authorization.json': modeAuth,
    'trading-choke-analysis.json': choke,
    'candidate-decision-traces.json': pipeline.slice(-200),
    'r17-decision-traces.json':r17DecisionTraces,
    'linked-trading-funnel.json':engine?.tradingFunnelSnapshot?.()||{status:'UNAVAILABLE'},
    'native-trading-funnel.json':nativeFunnel||{status:'NOT_COLLECTED',counts:null},
    'athena-golden-saints-lifecycle.json': athena,
    'event-cap-and-ticker-locks.json': locks,
    'market-book-and-timing.json': market,
    'broker-and-fill-lifecycle.json': broker,
    'recovery-chain-transitions.json': chains,
    'sim-live-parity.json': parity,
    'runtime-liveness.json': liveness,
    'decision-settings-observations.json': settingsSnapshots,
    'financial-reconciliation-summary.json': finance,
    'diagnostic-coverage.json': coverage,
  };
  return files;
}

export function fullTradingDiagnosticFiles(engine, now = Date.now(), nativeFunnel=null) {
  const files = buildFullTradingDiagnostic(engine, now,nativeFunnel);
  const packed = Object.entries(files).map(([name, value]) => ({
    name, data: Buffer.from(JSON.stringify(value), 'utf8'),
  }));
  return { files: packed, names: Object.keys(files), maxBytes: FULL_TRADING_DIAGNOSTIC_MAX_BYTES };
}
