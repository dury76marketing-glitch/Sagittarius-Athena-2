import { BUILD_INFO } from './authority.mjs';
import { RELEASE } from './config.mjs';

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
  return out;
}

function age(now, at) {
  const n = Number(at || 0);
  return n > 0 ? now - n : null;
}

function firstReduction(funnel) {
  const reasons = funnel?.currentByReason || {};
  const ranked = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  return ranked[0] ? { reason: ranked[0][0], count: ranked[0][1] } : null;
}

export function buildFullTradingDiagnostic(engine, now = Date.now()) {
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
  const funnel = engine?.entryCandidateFunnel || engine?.strategy?.entryCandidateFunnel || null;
  const choke = {
    engineProcessing: engine?.health?.operational?.newEntriesAllowed !== false && engine?.health?.degraded !== true,
    activeStages: [...new Set(pipeline.map(e => e.stage).filter(Boolean))],
    firstMeaningfulReduction: firstReduction(funnel) || (pipeline.find(e => e.status === 'BLOCKED') ? { reason: pipeline.find(e => e.status === 'BLOCKED').reason, count: 1 } : null),
    configurationControlled: ['shadow_event_lifetime_cap', 'athena_starlight_below_trigger', 'maxEntriesPerTrade'],
    safetyControlled: ['ticker_lock', 'market_or_book_invalid', 'fee_budget_exhausts_aurora_loss_envelope', 'live_fill_unconfirmed'],
    suspectedDefects: durable.filter(w => w.status === 'CONSUMED' && !w.recoveredChildId).slice(0, 20),
    insufficientEvidence: ['broker_fill_not_in_memory', 'historical_setting_at_decision_time'],
    recentCandidateBlocks: pipeline.filter(e => e.status === 'BLOCKED').slice(-40),
    byReason,
    note: 'Repeated evaluations of the same watch are not independent opportunities. A rejection is not a missed profit.',
  };
  const athena = {
    question: 'Why did Athena not produce Starlight?',
    answer: durable.some(w => ['WATCHING','READY','EXECUTING'].includes(w.status))
      ? 'Recovery watches exist. See watch states.'
      : 'No active recovery watch. Starlight arms only after a verified Athena shadow hard_stop. If no hard stop occurred in this window, absence of a watch is not a code failure.',
    openShadowEvidence: 'See athenaRows if the export included a bounded shadow page. In-memory watches are listed in watches.',
    watches: durable.slice(0, 200),
    modelClones: [...(engine.starlightModelClones?.values?.()||[])].slice(0, 200),
    independentRecovery: [...(engine.independentRecoveryWatches?.values?.()||[])].slice(0, 200).map(w=>({
      authorizationId:w.authorizationId,concept:w.concept,ticker:w.ticker,status:w.status,
      parentEntryId:w.parentEntryId,stopPriceCents:w.stopPriceCents,peakSinceArmCents:w.peakSinceArmCents,
      troughSinceArmCents:w.troughSinceArmCents,upwardTicks:w.upwardTicks,lastAttemptReason:w.lastAttemptReason,
      armedAtMs:w.armedAtMs,releaseAtMs:w.releaseAtMs,revision:w.revision,childId:w.childId||null,
    })),
    qualifyingHardStopsInWindow: durable.filter(w => Number(w.armedAtMs || 0) >= windowStart).length,
    parentEvidence: 'A durable recovery watch is itself the parent-stop proof. Do not infer zero parents from an empty pipeline sample.',
    notEligible: 'A profitable Athena exit does not arm Starlight. Only hard_stop_loss of a shadow Athena arms recovery.',
  };
  const locks = {
    tickerLock: {
      rule: 'exactTickerExposureClear: one open hunter per ticker per attack when Multiply is 1. Galactic ON allows a different attack on the same ticker.',
      currentBlocks: pipeline.filter(e => e.reason === 'ticker_lock').slice(-30),
      suspectedStale: false,
      note: 'A lock held by an open shadow is expected. This export does not release locks.',
    },
    eventCap: {
      configuredMaximum: Number(settings.maxEntriesPerTrade ?? 1),
      rule: 'shadow_event_lifetime_cap counts non-rejected shadow rows on the event for the epoch. Closed rows count. Rejected rows do not.',
      sharedOrIndependent: settings.galacticExplosionEnabled === true ? 'per attack when Galactic is ON' : 'shared across attacks',
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
  const chains = {
    chain1: 'Athena shadow hard_stop -> Starlight, Lightning Plasma and Sagittarius Arrow enter together on Starlight settings. Plasma loss still arms Great Horn -> Crystal Wall.',
    chain2: 'Arrow is a Starlight clone, not a Starlight-open follower. Arrow loss still arms Scarlet Needle -> Pegasus.',
    starlightParentsInWindow: athena.qualifyingHardStopsInWindow,
    childStatus: durable.length === 0 ? 'NOT_REACHED_PARENT_NOT_ELIGIBLE' : 'PARENT_WATCH_EXISTS',
  };
  const parity = { status: 'COMPARISON_UNAVAILABLE_MISSING_MATCHED_EVENT_DATA' };
  const coverage = {
    windowStartMs: windowStart, windowEndMs: now,
    pipelineEventsUsed: pipeline.length, watchesUsed: durable.length,
    historicalSettingAtDecision: 'NOT_AVAILABLE',
    sampled: true, fullHistory: false,
  };
  const manifest = {
    kind: 'FULL-TRADING-DIAGNOSTIC',
    release: RELEASE,
    build: BUILD_INFO?.id || RELEASE,
    exportedAtMs: now,
    mode: settings.mode || null,
    maxBytes: FULL_TRADING_DIAGNOSTIC_MAX_BYTES,
    readOnly: true,
    tradingUnchanged: true,
  };
  const files = {
    'diagnostic-manifest.json': manifest,
    'effective-settings.json': safeSettings(settings),
    'trading-choke-analysis.json': choke,
    'candidate-decision-traces.json': pipeline.slice(-200),
    'athena-starlight-lifecycle.json': athena,
    'event-cap-and-ticker-locks.json': locks,
    'market-book-and-timing.json': market,
    'broker-and-fill-lifecycle.json': broker,
    'recovery-chain-transitions.json': chains,
    'sim-live-parity.json': parity,
    'diagnostic-coverage.json': coverage,
  };
  return files;
}

export function fullTradingDiagnosticFiles(engine, now = Date.now()) {
  const files = buildFullTradingDiagnostic(engine, now);
  const packed = Object.entries(files).map(([name, value]) => ({
    name, data: Buffer.from(JSON.stringify(value), 'utf8'),
  }));
  return { files: packed, names: Object.keys(files), maxBytes: FULL_TRADING_DIAGNOSTIC_MAX_BYTES };
}
