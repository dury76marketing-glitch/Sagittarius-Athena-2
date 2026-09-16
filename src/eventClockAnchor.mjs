export const EVENT_CLOCK_ANCHOR = Object.freeze({
  version: 'ECA1',
  policyRevision: 'ECA1-R1-CRYSTAL-WALL-LEADING-EVENT-CLOCK',
  episodePrefix: 'EVENT-CLOCK:',
});

export function eventClockEpisodeId(eventTicker) {
  return `${EVENT_CLOCK_ANCHOR.episodePrefix}${String(eventTicker || '')}`;
}

export function projectEventClock(record, nowMs = Date.now()) {
  if (!record || record.leading !== true) return { ok: false, reason: 'no_event_clock', elapsedMinutes: null };
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
} = {}) {
  const event = String(eventTicker || '');
  const minutes = Number(elapsedMinutes);
  if (!event) return { ok: false, reason: 'missing_event_ticker' };
  if (!Number.isFinite(minutes) || minutes < 0) return { ok: false, reason: 'invalid_elapsed_minutes' };
  if (prior?.leading === true && String(prior.phase || '') === 'FINAL') {
    return { ok: false, reason: 'game_final', record: prior };
  }
  if (prior?.leading === true && String(phase) !== 'FINAL') {
    return { ok: true, reason: 'already_anchored', record: prior, projected: projectEventClock(prior, nowMs) };
  }
  const record = {
    version: EVENT_CLOCK_ANCHOR.version,
    policyRevision: EVENT_CLOCK_ANCHOR.policyRevision,
    eventTicker: event,
    ticker: String(ticker || ''),
    crystalWallEntryId: String(crystalWallEntryId || ''),
    anchoredElapsedMinutes: minutes,
    anchoredAtMs: Number(nowMs),
    source: String(source || 'crystal_wall_open'),
    phase: String(phase || 'CONFIRMED'),
    leading: true,
  };
  return { ok: String(phase) !== 'FINAL', reason: String(phase) === 'FINAL' ? 'game_final' : 'anchored', record };
}
