/**
 * R17.7 factory profile: exact SGT-2 owner-selected saved trading settings.
 * Sources: Sagittarius full trading diagnostic 2026-11-24T08-10-35-950Z
 *          Sagittarius ledger export 2026-11-24T08-23-00-657Z.
 * The two independently exported snapshots agree on all 414 effective setting
 * values. Only the 215 factory-editable scalar settings and 12 Gold Saint cards
 * are eligible for copying; unchanged scalars inherit the previous immutable
 * factory base. Runtime mode, LIVE arm, owner/clone identity, credentials,
 * reset epochs and persisted installation settings are NOT copied.
 * This changes fresh-install / explicit factory-reset defaults only.
 */
import {SGT2_STABILITY_FACTORY_PROFILE_20261122} from './factoryProfile20261122.mjs';

const GOLDEN_SAINT_CARDS_SGT2_20261124 = Object.freeze({
  Aries: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Taurus: Object.freeze({"enabled": true, "linkEnabled": true, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Gemini: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 0, "minUpwardTicks": 0, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Cancer: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 0, "minUpwardTicks": 0, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Leo: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 6, "minReboundCents": 9, "minUpwardTicks": 3, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Virgo: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 6, "minReboundCents": 9, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Libra: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 6, "minReboundCents": 12, "minUpwardTicks": 6, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Scorpio: Object.freeze({"enabled": true, "linkEnabled": true, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Sagittarius: Object.freeze({"enabled": true, "linkEnabled": true, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Capricorn: Object.freeze({"enabled": true, "linkEnabled": true, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 10}),
  Aquarius: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 50, "maxEntryCents": 90, "maxSpreadCents": 4, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 2, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 1}),
  Pisces: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 50, "maxEntryCents": 90, "maxSpreadCents": 4, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 2, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 1}),
});

export const SGT2_FACTORY_PROFILE_20261124_082300 = Object.freeze({
  ...SGT2_STABILITY_FACTORY_PROFILE_20261122,
  minGameMinutes: 20,
  maxGameMinutes: 90,
  auroraStopWindowMinutes: 35,
  goldenSaints: GOLDEN_SAINT_CARDS_SGT2_20261124,
});
