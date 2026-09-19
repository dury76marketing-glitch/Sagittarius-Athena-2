export const EVENT_CLOCK_ANCHOR = Object.freeze({
  version: 'ECA1',
  policyRevision: 'ECA1-R2-CONFIRMED-GCA-EXECUTABLE-LEADER',
  episodePrefix: 'EVENT-CLOCK:',
  approvedExecutableSources: Object.freeze([
    'confirmed_clock_at_crystal_wall',
    'confirmed_gca_promoted',
    'kalshi_live_data',
    'kalshi_game_stats',
  ]),
});

export function isExecutableLeadingEventClock(record, resetTimestampMs = 0) {
  if (!record || record.leading !== true) return false;
  if (record.provisional === true) return false;
  if (record.executableAuthority !== true) return false;
  if (record.clockConfirmed === false) return false;
  if (String(record.phase || '') !== 'CONFIRMED') return false;
  const minutes = Number(record.anchoredElapsedMinutes);
  if (!Number.isFinite(minutes) || minutes < 0) return false;
  const epoch = Math.max(0, Number(resetTimestampMs) || 0);
  if (epoch > 0) {
    const recordEpoch = Math.max(0, Number(record.resetEpoch || record.resetTimestampMs || 0));
    if (recordEpoch !== epoch) return false;
  }
  return true;
}

export function eventClockEpisodeId(eventTicker) {
  return `${EVENT_CLOCK_ANCHOR.episodePrefix}${String(eventTicker || '')}`;
}

export function projectEventClock(record, nowMs = Date.now(), { resetTimestampMs = null } = {}) {
  if (!record || record.leading !== true) return { ok: false, reason: 'no_event_clock', elapsedMinutes: null };
  if (record.provisional === true || record.executableAuthority === false || record.clockConfirmed === false) {
    return { ok: false, reason: 'event_clock_waiting_for_confirmed_game_time', elapsedMinutes: null, record, executableAuthority: false };
  }
  const expected = resetTimestampMs == null ? null : Math.max(0, Number(resetTimestampMs) || 0);
  if (expected != null && expected > 0) {
    const recordEpoch = Math.max(0, Number(record.resetEpoch || record.resetTimestampMs || 0));
    if (recordEpoch !== expected) return { ok: false, reason: 'stale_pre_reset_game_clock_authority', elapsedMinutes: null, record, historical: true, executableAuthority: false };
  }
  if (String(record.phase || '') === 'FINAL') {
    return { ok: false, reason: 'game_final', elapsedMinutes: Number(record.anchoredElapsedMinutes || 0), record };
  }
  const anchored = Number(record.anchoredElapsedMinutes);
  const anchoredAtMs = Number(record.anchoredAtMs);
  if (!Number.isFinite(anchored) || anchored < 0 || !Number.isFinite(anchoredAtMs) || anchoredAtMs <= 0) {
    return { ok: false, reason: 'invalid_event_clock', elapsedMinutes: null, record };
  }
  const elapsedWallMinutes = Math.max(0, (Number(nowMs) - anchoredAtMs) / 60000);
  return {
    ok: true,
    reason: 'inherited_crystal_wall_clock',
    elapsedMinutes: anchored + elapsedWallMinutes,
    elapsedWallMinutes,
    anchoredElapsedMinutes: anchored,
    record,
  };
}

export function stampEventClockRecord({
  eventTicker,
  ticker = '',
  crystalWallEntryId = '',
  elapsedMinutes,
  nowMs = Date.now(),
  source = 'crystal_wall_open',
  phase = 'CONFIRMED',
  prior = null,
  resetTimestampMs = 0,
  executableAuthority = true,
  provisional = false,
  clockConfirmed = true,
  anchorClockReconstructionReason = '',
  anchorAuthoritySource = '',
  anchorSourceCurrentElapsedMinutes = null,
} = {}) {
  const event = String(eventTicker || '');
  const minutes = Number(elapsedMinutes);
  const epoch = Math.max(0, Number(resetTimestampMs) || 0);
  if (!event) return { ok: false, reason: 'missing_event_ticker' };
  const priorExecutable = isExecutableLeadingEventClock(prior, epoch);
  if (priorExecutable && String(prior.phase || '') === 'FINAL') {
    return { ok: false, reason: 'game_final', record: prior };
  }
  if (priorExecutable && String(phase) !== 'FINAL') {
    return { ok: true, reason: 'already_anchored', record: prior, projected: projectEventClock(prior, nowMs, { resetTimestampMs: epoch || null }) };
  }
  if (provisional === true || executableAuthority === false || String(phase) === 'UNKNOWN') {
    const record = {
      version: EVENT_CLOCK_ANCHOR.version,
      policyRevision: EVENT_CLOCK_ANCHOR.policyRevision,
      eventTicker: event,
      ticker: String(ticker || ''),
      crystalWallEntryId: String(crystalWallEntryId || ''),
      anchoredElapsedMinutes: Number.isFinite(minutes) ? minutes : null,
      anchoredAtMs: Number(nowMs),
      source: String(source || 'event_clock_waiting_for_confirmed_game_time'),
      phase: 'UNKNOWN',
      leading: true,
      resetEpoch: epoch,
      resetTimestampMs: epoch,
      executableAuthority: false,
      provisional: true,
      clockConfirmed: false,
      anchorSource: String(source || 'event_clock_waiting_for_confirmed_game_time'),
      anchorAuthoritySource: String(anchorAuthoritySource || ''),
      anchorClockReconstructionReason: String(anchorClockReconstructionReason || 'event_clock_waiting_for_confirmed_game_time'),
      anchorSourceCurrentElapsedMinutes: null,
      anchorEstablishedAtMs: Number(nowMs),
    };
    return { ok: false, reason: 'event_clock_waiting_for_confirmed_game_time', record };
  }
  if (!Number.isFinite(minutes) || minutes < 0) return { ok: false, reason: 'invalid_elapsed_minutes' };
  const record = {
    version: EVENT_CLOCK_ANCHOR.version,
    policyRevision: EVENT_CLOCK_ANCHOR.policyRevision,
    eventTicker: event,
    ticker: String(ticker || ''),
    crystalWallEntryId: String(crystalWallEntryId || ''),
    anchoredElapsedMinutes: minutes,
    anchoredAtMs: Number(nowMs),
    source: String(source || 'confirmed_clock_at_crystal_wall'),
    phase: String(phase || 'CONFIRMED'),
    leading: true,
    resetEpoch: epoch,
    resetTimestampMs: epoch,
    executableAuthority: true,
    provisional: false,
    clockConfirmed: clockConfirmed !== false,
    anchorSource: String(source || 'confirmed_clock_at_crystal_wall'),
    anchorAuthoritySource: String(anchorAuthoritySource || 'kalshi_game_clock'),
    anchorClockReconstructionReason: String(anchorClockReconstructionReason || ''),
    anchorSourceCurrentElapsedMinutes: Number.isFinite(Number(anchorSourceCurrentElapsedMinutes)) ? Number(anchorSourceCurrentElapsedMinutes) : minutes,
    anchorEstablishedAtMs: Number(nowMs),
  };
  return { ok: String(phase) !== 'FINAL', reason: String(phase) === 'FINAL' ? 'game_final' : 'anchored', record };
}
