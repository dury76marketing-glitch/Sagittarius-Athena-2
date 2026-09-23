import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPERATOR_TIME_ZONE,
  operatorWallClock,
  shutdownWindowContains,
  sessionShutdownState,
  sessionIdleMaintenancePlan,
  gameClockEntryDecision,
  sessionScheduleFromSettings,
} from '../src/operatorSession.mjs';

function madridMs(isoLocal) {
  // isoLocal: '2026-09-23T01:00:00' interpreted as Europe/Madrid wall time.
  const naive = new Date(`${isoLocal}Z`).getTime();
  const asIfUtc = operatorWallClock(naive, 'UTC');
  const asMadrid = operatorWallClock(naive, OPERATOR_TIME_ZONE);
  const deltaMin = asMadrid.minutesFromMidnight - asIfUtc.minutesFromMidnight;
  return naive - deltaMin * 60_000;
}

test('operator wall clock uses Europe/Madrid as the leading clock', () => {
  const summer = operatorWallClock(Date.parse('2026-09-23T07:32:00Z'));
  assert.equal(summer.timeZone, 'Europe/Madrid');
  assert.equal(summer.hour, 9);
  assert.equal(summer.minute, 32);
  const winter = operatorWallClock(Date.parse('2026-01-15T07:32:00Z'));
  assert.equal(winter.hour, 8);
  assert.equal(winter.minute, 32);
});

test('01:00-07:00 Madrid shutdown wraps only that night window', () => {
  assert.equal(shutdownWindowContains(60, 60, 420), true);   // 01:00
  assert.equal(shutdownWindowContains(419, 60, 420), true);  // 06:59
  assert.equal(shutdownWindowContains(420, 60, 420), false); // 07:00 reopen
  assert.equal(shutdownWindowContains(59, 60, 420), false);  // 00:59 still open
  assert.equal(shutdownWindowContains(12 * 60, 60, 420), false);
});

test('23:00-07:00 wraps midnight', () => {
  assert.equal(shutdownWindowContains(23 * 60, 23 * 60, 7 * 60), true);
  assert.equal(shutdownWindowContains(0, 23 * 60, 7 * 60), true);
  assert.equal(shutdownWindowContains(7 * 60 - 1, 23 * 60, 7 * 60), true);
  assert.equal(shutdownWindowContains(7 * 60, 23 * 60, 7 * 60), false);
  assert.equal(shutdownWindowContains(12 * 60, 23 * 60, 7 * 60), false);
});

test('editable 01:00-07:00 session blocks entries and authorizes maintenance', () => {
  const settings = {
    sessionShutdownEnabled: true,
    sessionStopHour: 1,
    sessionStopMinute: 0,
    sessionStartHour: 7,
    sessionStartMinute: 0,
  };
  const closed = sessionShutdownState(settings, madridMs('2026-09-23T03:15:00'));
  assert.equal(closed.wall.hour, 3);
  assert.equal(closed.shutdown, true);
  assert.equal(closed.entriesAuthorized, false);
  assert.equal(closed.protectionAuthorized, true);
  assert.equal(closed.exitsAuthorized, true);
  assert.equal(closed.maintenanceAuthorized, true);
  assert.equal(closed.reason, 'session_shutdown_idle');
  const plan = sessionIdleMaintenancePlan(closed);
  assert.equal(plan.blockEntries, true);
  assert.ok(plan.tasks.includes('resource_governor'));

  const open = sessionShutdownState(settings, madridMs('2026-09-23T09:28:00'));
  assert.equal(open.wall.hour, 9);
  assert.equal(open.wall.minute, 28);
  assert.equal(open.shutdown, false);
  assert.equal(open.entriesAuthorized, true);
  assert.equal(open.reason, 'session_open');
  assert.equal(sessionIdleMaintenancePlan(open).runMaintenance, false);
});

test('session OFF never blocks and keeps Madrid clock visible', () => {
  const state = sessionShutdownState({
    sessionShutdownEnabled: false,
    sessionStopHour: 1,
    sessionStartHour: 7,
  }, madridMs('2026-09-23T03:15:00'));
  assert.equal(state.shutdown, false);
  assert.equal(state.reason, 'session_shutdown_disabled');
  assert.equal(state.wall.hour, 3);
});

test('game clock gate OFF stays retired even at minute 82', () => {
  const decision = gameClockEntryDecision({
    settings: { gameClockEntryGateEnabled: false, minGameMinutes: 30, maxGameMinutes: 55 },
    elapsedMinutes: 82,
  });
  assert.equal(decision.ok, true);
  assert.equal(decision.reason, 'clock_authority_retired');
  assert.equal(decision.clockAuthority, 'NONE');
});

test('game clock gate ON blocks below min and above max and passes inside', () => {
  const settings = { gameClockEntryGateEnabled: true, minGameMinutes: 30, maxGameMinutes: 55 };
  assert.equal(gameClockEntryDecision({ settings, elapsedMinutes: 4 }).reason, 'minimum_game_time');
  assert.equal(gameClockEntryDecision({ settings, elapsedMinutes: 82 }).reason, 'maximum_game_time');
  const pass = gameClockEntryDecision({ settings, elapsedMinutes: 42 });
  assert.equal(pass.ok, true);
  assert.equal(pass.reason, 'game_clock_window');
  assert.equal(gameClockEntryDecision({ settings, elapsedMinutes: null }).reason, 'game_clock_unresolved');
});

test('schedule hydrate clamps junk hours and keeps default 01:00-07:00', () => {
  const schedule = sessionScheduleFromSettings({
    sessionShutdownEnabled: true,
    sessionStopHour: 99,
    sessionStopMinute: -4,
    sessionStartHour: '7',
    sessionStartMinute: 99,
  });
  assert.equal(schedule.stopLabel, '23:00');
  assert.equal(schedule.startHour, 7);
  assert.equal(schedule.startMinute, 59);
});
