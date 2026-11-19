/**
 * Q-17 SIM-only owner-directed Lightning Plasma replacement.
 * Reset the old independent CAPITAL entry card ONCE to the proven Sagittarius
 * Arrow card values, but retain the distinct Lightning Plasma persisted keys,
 * parent proof, own orders, account ledger and LP -> GH -> CW recovery lineage.
 * Never copy Arrow enablement, Arrow source/parent identifiers, or LIVE rights.
 */
export const LP_ARROW_PARITY_VERSION = 'Q17-LP-ARROW-INDEPENDENT-CAPITAL-R4';
export const LP_ARROW_PARITY_MAPPINGS = Object.freeze([
  ['lightningPlasmaFieldStakeCents','sagittariusArrowStakeCents'],
  ['lightningPlasmaMinEntryCents','sagittariusArrowMinEntryCents'],
  ['lightningPlasmaMaxEntryCents','sagittariusArrowMaxEntryCents'],
  ['lightningPlasmaMinCrashCents','sagittariusArrowMinCrashCents'],
  ['lightningPlasmaMinReboundCents','sagittariusArrowMinReboundCents'],
  ['lightningPlasmaMinUpwardTicks','sagittariusArrowMinUpwardTicks'],
  ['lightningPlasmaObservationMinutes','sagittariusArrowObservationMinutes'],
  ['lightningPlasmaAuroraDamageControlPercent','sagittariusArrowAuroraDamageControlPercent'],
  ['lightningPlasmaMultiply','sagittariusArrowMultiply'],
  ['lightningPlasmaMinProfitNetPerOriginalContractCents','sagittariusArrowMinProfitNetPerOriginalContractCents'],
  ['lightningPlasmaAthenaX1Enabled','sagittariusArrowAthenaX1Enabled'],
]);
export function q17LightningPlasmaArrowParityMigration(settings={}){
  if(settings.q17LightningPlasmaArrowParityApplied===true)
    return {changed:false,settings:{...settings},changedKeys:[]};
  if(settings.mode!=='SIMULATION')throw new Error('q17_plasma_parity_requires_simulation');
  const next={...settings};
  for(const [target,source] of LP_ARROW_PARITY_MAPPINGS){
    if(next[source]===undefined||next[source]===null||!Number.isFinite(Number(next[source])))
      throw new Error(`q17_plasma_parity_missing_arrow_setting:${source}`);
    next[target]=next[source];
  }
  // Retire the competing Starlight +c scale-in route. The independent Athena
  // shadow-loss watch is now the ONLY authorized LP capital-entry authority.
  next.lightningPlasmaStarlightScaleInCents=0;
  next.q17LightningPlasmaArrowParityApplied=true;
  return {changed:true,settings:next,changedKeys:[...LP_ARROW_PARITY_MAPPINGS.map(([target])=>target),'lightningPlasmaStarlightScaleInCents','q17LightningPlasmaArrowParityApplied']};
}
