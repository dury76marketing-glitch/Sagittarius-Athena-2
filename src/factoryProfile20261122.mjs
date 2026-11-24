/** Sagittarius R17.7 SGT-2 LIVE ledger factory, 2026-11-22 19:58 UTC.
 * Source: sagittarius-ledger-2026-11-22T19-58-47-189Z, system SGT-2-Q17-R8-STAGING.
 * Owner directive: these twelve cards are the factory defaults.
 * Mode, liveArmed, credentials, owner identity and persisted clone settings
 * are not imported. This module never arms LIVE or sends orders.
 */
import {LEDGER_FACTORY_PROFILE_20261121_205533} from './factoryProfile20261121.mjs';

const LEDGER_CARDS_20261122_1958 = Object.freeze({
  Aries: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Taurus: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Gemini: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Cancer: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Leo: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Virgo: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Libra: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Scorpio: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Sagittarius: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Capricorn: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 70, "maxEntryCents": 90, "maxSpreadCents": 3, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 7, "minUpwardTicks": 4, "auroraDamageControlPercent": 35, "minProfitNetPerOriginalContractCents": 1}),
  Aquarius: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 50, "maxEntryCents": 90, "maxSpreadCents": 4, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 2, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 1}),
  Pisces: Object.freeze({"enabled": true, "linkEnabled": false, "athenaX1Enabled": true, "observationMinutes": 0, "stakeCents": 100, "multiply": 1, "minEntryCents": 50, "maxEntryCents": 90, "maxSpreadCents": 4, "parentEntryRiseCents": 1, "minCrashCents": 0, "minReboundCents": 2, "minUpwardTicks": 4, "auroraDamageControlPercent": 65, "minProfitNetPerOriginalContractCents": 1})
});

const baseline=LEDGER_FACTORY_PROFILE_20261121_205533;
export const SGT2_STABILITY_FACTORY_PROFILE_20261122 = Object.freeze({
  ...baseline,
  goldenSaints:LEDGER_CARDS_20261122_1958,
});
