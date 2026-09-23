export const OPERATOR_TIME_ZONE = 'Europe/Madrid';
export const OPERATOR_SESSION = Object.freeze({
  version: 'OPERATOR-SESSION-V1',
  policyRevision: 'OS1-R1-MADRID-WALL-CLOCK',
  timeZone: OPERATOR_TIME_ZONE,
  role: 'editable_night_shutdown_plus_optional_game_clock_entry_gate',
  defaultEnabled: false,
  defaultStopHour: 1,
  defaultStopMinute: 0,
  defaultStartHour: 7,
  defaultStartMinute: 0,
  leadingClock: 'operator_wall_europe_madrid',
});

function clampInt(value, min, max, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function minutesFromHourMinute(hour, minute) {
  const h = clampInt(hour, 0, 23, 0);
  const m = clampInt(minute, 0, 59, 0);
  return h * 60 + m;
}

export function formatMinutesFromMidnight(total) {
  const safe = ((Math.floor(Number(total)) % 1440) + 1440) % 1440;
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function operatorWallClock(nowMs = Date.now(), timeZone = OPERATOR_TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(nowMs)).map((row) => [row.type, row.value]));
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return {
    timeZone,
    leadingClock: OPERATOR_SESSION.leadingClock,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour,
    minute,
    second,
    minutesFromMidnight: hour * 60 + minute,
    clockLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
    dateLabel: `${parts.year}-${parts.month}-${parts.day}`,
    nowMs: Number(nowMs),
  };
}

export function shutdownWindowContains(nowMinutes, stopMinutes, startMinutes) {
  const now = ((Math.floor(Number(nowMinutes)) % 1440) + 1440) % 1440;
  const stop = ((Math.floor(Number(stopMinutes)) % 1440) + 1440) % 1440;
  const start = ((Math.floor(Number(startMinutes)) % 1440) + 1440) % 1440;
  if (stop === start) return false;
  if (stop < start) return now >= stop && now < start;
  return now >= stop || now < start;
}

export function sessionScheduleFromSettings(settings = {}) {
  const stopHour = clampInt(settings.sessionStopHour, 0, 23, OPERATOR_SESSION.defaultStopHour);
  const stopMinute = clampInt(settings.sessionStopMinute, 0, 59, OPERATOR_SESSION.defaultStopMinute);
  const startHour = clampInt(settings.sessionStartHour, 0, 23, OPERATOR_SESSION.defaultStartHour);
  const startMinute = clampInt(settings.sessionStartMinute, 0, 59, OPERATOR_SESSION.defaultStartMinute);
  return {
    enabled: settings.sessionShutdownEnabled === true,
    timeZone: OPERATOR_TIME_ZONE,
    stopHour,
    stopMinute,
    startHour,
    startMinute,
    stopMinutes: minutesFromHourMinute(stopHour, stopMinute),
    startMinutes: minutesFromHourMinute(startHour, startMinute),
    stopLabel: formatMinutesFromMidnight(minutesFromHourMinute(stopHour, stopMinute)),
    startLabel: formatMinutesFromMidnight(minutesFromHourMinute(startHour, startMinute)),
  };
}

export function sessionShutdownState(settings = {}, nowMs = Date.now()) {
  const wall = operatorWallClock(nowMs);
  const schedule = sessionScheduleFromSettings(settings);
  if (schedule.enabled !== true) {
    return {
      version: OPERATOR_SESSION.version,
      policyRevision: OPERATOR_SESSION.policyRevision,
      enabled: false,
      shutdown: false,
      entriesAuthorized: true,
      protectionAuthorized: true,
      exitsAuthorized: true,
      scannerAuthorized: true,
      maintenanceAuthorized: false,
      reason: 'session_shutdown_disabled',
      wall,
      schedule,
    };
  }
  const shutdown = shutdownWindowContains(wall.minutesFromMidnight, schedule.stopMinutes, schedule.startMinutes);
  return {
    version: OPERATOR_SESSION.version,
    policyRevision: OPERATOR_SESSION.policyRevision,
    enabled: true,
    shutdown,
    entriesAuthorized: shutdown !== true,
    protectionAuthorized: true,
    exitsAuthorized: true,
    scannerAuthorized: true,
    maintenanceAuthorized: shutdown === true,
    reason: shutdown ? 'session_shutdown_idle' : 'session_open',
    wall,
    schedule,
  };
}

export function sessionIdleMaintenancePlan(state) {
  if (!state || state.shutdown !== true) {
    return {
      runMaintenance: false,
      blockEntries: false,
      allowProtection: true,
      allowExits: true,
      allowScanner: true,
      tasks: [],
    };
  }
  return {
    runMaintenance: true,
    blockEntries: true,
    allowProtection: true,
    allowExits: true,
    allowScanner: true,
    tasks: Object.freeze([
      'market_cache_prune',
      'invalid_book_refresh',
      'resource_governor',
      'crash_persist_flush',
      'post_exit_research',
    ]),
  };
}

export function gameClockEntryDecision({
  settings = {},
  elapsedMinutes = null,
} = {}) {
  const enabled = settings.gameClockEntryGateEnabled === true;
  const minGameMinutes = Math.max(0, Number(settings.minGameMinutes || 0));
  const maxGameMinutes = Math.max(0, Number(settings.maxGameMinutes || 0));
  const elapsed = elapsedMinutes==null || elapsedMinutes==='' ? NaN : Number(elapsedMinutes);
  if (enabled !== true) {
    return {
      ok: true,
      status: 'PASS',
      reason: 'clock_authority_retired',
      clockAuthority: 'NONE',
      gateEnabled: false,
      elapsedMinutes: Number.isFinite(elapsed) ? elapsed : null,
      minGameMinutes,
      maxGameMinutes,
    };
  }
  if (!Number.isFinite(elapsed)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'game_clock_unresolved',
      clockAuthority: 'OPERATOR_WINDOW',
      gateEnabled: true,
      elapsedMinutes: null,
      minGameMinutes,
      maxGameMinutes,
    };
  }
  if (elapsed < minGameMinutes) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'minimum_game_time',
      clockAuthority: 'OPERATOR_WINDOW',
      gateEnabled: true,
      elapsedMinutes: elapsed,
      minGameMinutes,
      maxGameMinutes,
    };
  }
  if (maxGameMinutes > 0 && elapsed > maxGameMinutes) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'maximum_game_time',
      clockAuthority: 'OPERATOR_WINDOW',
      gateEnabled: true,
      elapsedMinutes: elapsed,
      minGameMinutes,
      maxGameMinutes,
    };
  }
  return {
    ok: true,
    status: 'PASS',
    reason: 'game_clock_window',
    clockAuthority: 'OPERATOR_WINDOW',
    gateEnabled: true,
    elapsedMinutes: elapsed,
    minGameMinutes,
    maxGameMinutes,
  };
}
