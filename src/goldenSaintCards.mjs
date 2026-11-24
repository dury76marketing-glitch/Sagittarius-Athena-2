/** R17 constellation-card contract. This module has no dependencies on the
 * strategy, database, account, or deployment layers. It NEVER arms LIVE.
 */
export const GOLDEN_SAINTS_REGULAR = Object.freeze(['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn']);
export const GOLDEN_SAINTS_RECOVERY = Object.freeze(['Aquarius','Pisces']);
export const GOLDEN_SAINTS = Object.freeze([...GOLDEN_SAINTS_REGULAR,...GOLDEN_SAINTS_RECOVERY]);
export const GOLDEN_SAINTS_VERSION = 'R17-GOLDEN-SAINTS-1';
export const CARD_FIELDS = Object.freeze(['enabled','linkEnabled','athenaX1Enabled','observationMinutes','stakeCents','multiply','minEntryCents','maxEntryCents','maxSpreadCents','parentEntryRiseCents','minCrashCents','minReboundCents','minUpwardTicks','auroraDamageControlPercent','minProfitNetPerOriginalContractCents']);
const n=(s,key,fallback)=>Number.isFinite(Number(s?.[key]))?Number(s[key]):fallback;
export function goldenSaintTemplate(settings={},name='Aries'){
  const prefix=name==='Aquarius'?'greatHorn':name==='Pisces'?'crystalWallRecovery':'crashRecoveryHunter';
  const regular=prefix==='crashRecoveryHunter';
  return {
    // This is a new capital authority. Never infer enabling ten positions from
    // an existing LIVE clone's single historical Starlight toggle.
    enabled:false,
    linkEnabled:settings?.[prefix+'LinkEnabled']===true,
    athenaX1Enabled:settings?.[prefix+'AthenaX1Enabled']===true,
    observationMinutes:n(settings,prefix+'ObservationMinutes',0),
    stakeCents:n(settings,regular?'crashRecoveryStakeCents':prefix+'StakeCents',500),
    multiply:n(settings,prefix+'Multiply',1),
    minEntryCents:n(settings,regular?'crashRecoveryMinEntryCents':prefix+'MinEntryCents',50),
    maxEntryCents:n(settings,regular?'crashRecoveryMaxEntryCents':prefix+'MaxEntryCents',90),
    maxSpreadCents:n(settings,regular?'maxSpreadCents':prefix+'MaxSpreadCents',3),
    // Original Starlight's Athena +c trigger is not optional when copying its behavior.
    parentEntryRiseCents:n(settings,regular?'athenaExclamationStarlightTriggerCents':prefix+'ParentEntryRiseCents',0),
    minCrashCents:n(settings,prefix+'MinCrashCents',0),
    minReboundCents:n(settings,prefix+'MinReboundCents',0),
    minUpwardTicks:n(settings,prefix+'MinUpwardTicks',0),
    auroraDamageControlPercent:n(settings,prefix+'AuroraDamageControlPercent',55),
    minProfitNetPerOriginalContractCents:n(settings,prefix+'MinProfitNetPerOriginalContractCents',1),
  };
}
export function defaultGoldenSaintCards(settings={}){
  return Object.fromEntries(GOLDEN_SAINTS.map(name=>[name,goldenSaintTemplate(settings,name)]));
}
export function validateGoldenSaintCard(card){
  if(!card||typeof card!=='object'||Array.isArray(card)
    ||CARD_FIELDS.some(k=>!Object.hasOwn(card,k))
    ||Object.keys(card).some(k=>!CARD_FIELDS.includes(k)))return {ok:false,reason:'r17_card_fields_invalid'};
  for(const k of ['enabled','linkEnabled','athenaX1Enabled'])if(typeof card[k]!=='boolean')return {ok:false,reason:`r17_${k}_must_be_boolean`};
  for(const k of CARD_FIELDS.filter(x=>!['enabled','linkEnabled','athenaX1Enabled'].includes(x))){
    if(typeof card[k]!=='number'||!Number.isFinite(card[k]))return {ok:false,reason:`r17_${k}_not_finite`};
  }
  if(!Number.isInteger(card.observationMinutes)||card.observationMinutes<0||card.observationMinutes>1000
    ||!Number.isInteger(card.multiply)||card.multiply<1||card.multiply>20
    ||!Number.isInteger(card.minEntryCents)||!Number.isInteger(card.maxEntryCents)
    ||card.minEntryCents<1||card.maxEntryCents>99||card.minEntryCents>card.maxEntryCents
    ||!Number.isInteger(card.maxSpreadCents)||card.maxSpreadCents<0||card.maxSpreadCents>99
    ||!Number.isInteger(card.parentEntryRiseCents)||card.parentEntryRiseCents<0||card.parentEntryRiseCents>99
    ||!Number.isInteger(card.minCrashCents)||card.minCrashCents<0||card.minCrashCents>99
    ||!Number.isInteger(card.minReboundCents)||card.minReboundCents<0||card.minReboundCents>99
    ||!Number.isInteger(card.minUpwardTicks)||card.minUpwardTicks<0||card.minUpwardTicks>20
    ||!Number.isSafeInteger(card.stakeCents)||card.stakeCents<1||card.stakeCents>100000000
    ||!(card.auroraDamageControlPercent>0&&card.auroraDamageControlPercent<=95)
    ||!(card.minProfitNetPerOriginalContractCents>0&&card.minProfitNetPerOriginalContractCents<100))
    return {ok:false,reason:'r17_card_geometry_or_capital_invalid'};
  return {ok:true};
}
export function normalizeGoldenSaintCards(settings={},saved=undefined){
  const defaults=defaultGoldenSaintCards(settings);
  if(saved===undefined||saved===null)return defaults;
  if(!saved||typeof saved!=='object'||Array.isArray(saved)
    ||Object.keys(saved).some(k=>!GOLDEN_SAINTS.includes(k)))throw new Error('r17_cards_unknown_constellation');
  const next={};
  for(const name of GOLDEN_SAINTS){
    const patch=saved[name]??{};
    if(typeof patch!=='object'||Array.isArray(patch)||!patch||Object.keys(patch).some(k=>!CARD_FIELDS.includes(k)))
      throw new Error(`r17_invalid_${name}_card_patch`);
    next[name]={...defaults[name],...patch};
    const v=validateGoldenSaintCard(next[name]);
    if(!v.ok)throw new Error(`${name}:${v.reason}`);
  }
  return next;
}
export function applyGoldenSaintCardPatch(current,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!GOLDEN_SAINTS.includes(k)))
    throw new Error('r17_invalid_cards_patch');
  const result=structuredClone(current);
  for(const [name,change] of Object.entries(patch)){
    if(!change||typeof change!=='object'||Array.isArray(change)||Object.keys(change).some(k=>!CARD_FIELDS.includes(k)))
      throw new Error(`r17_${name}_invalid_patch`);
    const candidate={...result[name],...change};
    const v=validateGoldenSaintCard(candidate);
    if(!v.ok)throw new Error(`${name}:${v.reason}`);
    result[name]=candidate;
  }
  return result;
}
