let STATE=null;
let COSMO_FILTER='ALL';
let CONTROL_FINGERPRINT='';
let ATTACK_CONTROL_FINGERPRINT='';
let pendingRenderState=null,renderFrame=0;
let stateReadSequence=0,stateReadEpoch=0,modeChangePending=false;
let bootRetryTimer=null;
let financialSnapshotUnavailable=false,operatorStreamDisconnected=false;
// UI-only confidence flag: an interrupted SSE stream cannot prove current LIVE authorization.
// Cleared only after a valid, fresh state message from that stream.
let liveAuthorizationUnverified=false;
const $=(id)=>document.getElementById(id);
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(c)=>`${Number(c||0)>=0?'+':''}$${(Number(c||0)/100).toFixed(2)}`;
const moneyPlain=(c)=>`$${(Number(c||0)/100).toFixed(2)}`;
const pc=(c)=>c==null?'-':`${Number(c).toFixed(Number.isInteger(Number(c))?0:1)}c`;
const dpc=(c)=>c==null?'-':`${Number(c)>=0?'+':''}${Number(c).toFixed(Number.isInteger(Number(c))?0:1)}c`;
const pct01=(v)=>v==null?'-':`${(Number(v)*100).toFixed(1)}%`;
const duration=(ms)=>ms==null?'-':Number(ms)<60000?`${Math.round(Number(ms)/1000)}s`:Number(ms)<3600000?`${(Number(ms)/60000).toFixed(1)}m`:`${(Number(ms)/3600000).toFixed(1)}h`;
const mib=(b)=>Number.isFinite(Number(b))?`${(Number(b)/1048576).toFixed(1)} MiB`:'-';
const pnlClass=(v)=>Number(v)>0?'positive':Number(v)<0?'negative':'';
let windowModeArmDenial='';
// No dashboard operator username/password, Basic challenge, or pairing.
// The existing LIVE arming phrase and server-side financial safety gates
// remain unchanged. Network access controls are required for public LIVE use.
const operatorFetch=(url,options={})=>fetch(url,options);
const post=async(url,data={})=>{const r=await operatorFetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j;};
const patch=async(url,data)=>{const r=await operatorFetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j;};
function msg(text,bad=false){const e=$('actionMessage');if(!e)return;e.textContent=text;e.className=`message ${bad?'negative':'positive'}`;setTimeout(()=>{if(e.textContent===text)e.textContent='';},7000);}
function setPnl(id,v,plain=false){const e=$(id);if(!e)return;e.textContent=plain?moneyPlain(v):money(v);e.className=pnlClass(v);}
function setText(id,v){const e=$(id);if(e)e.textContent=v;}
function financialMoney(value,plain=false){return value==null||!Number.isFinite(Number(value))?'Unavailable':plain?moneyPlain(value):money(value);}
function setFinancialPnl(id,value,plain=false){const e=$(id);if(!e)return;e.textContent=financialMoney(value,plain);e.className=value==null?'muted':pnlClass(value);}
function markFinancialSnapshotUnavailable(reason){
  financialSnapshotUnavailable=true;
  // State reads and mode transitions can fail after valid numbers were shown.
  // Do not leave an old multi-attack result labelled as current when its
  // authoritative financial snapshot cannot be refreshed.
  for(const id of ['portfolioValue','simFreeCash','winRate','unrealized','realized','profitToday','profitWeek','profitMonth','profitYear','openCount','closedPerfCount',
    'capitalCombinedWinRate','capitalCombinedOpen','capitalCombinedClosed','capitalCombinedWinsLosses',
    'capitalCombinedPending','capitalCombinedRealized','capitalCombinedUnrealized',
    'capitalCombinedToday','capitalCombinedWeek','capitalCombinedMonth','capitalCombinedYear'])setText(id,'Unavailable');
  setText('capitalCombinedFinancialStatus',reason+' Combined capital snapshot unavailable until a verified refresh succeeds.');
  setText('capitalAttackResultsStatus',reason+' Financial table unavailable until a new verified snapshot is received.');
  const reportBody=$('capitalAttackResultsBody');if(reportBody)reportBody.innerHTML='<tr><td colspan="11" class="muted">Unavailable — waiting for a verified financial snapshot.</td></tr>';
  for(const row of document.querySelectorAll('#attackBody tr[data-attack-index]')){
    if(Number(row.dataset.attackIndex)<1)continue;
    for(const cell of row.querySelectorAll('[data-attack-metric]')){
      cell.textContent='Unavailable';cell.classList.add('muted');
    }
  }
  // Virtual reporting is a separate read-only channel, but stale shadow
  // results must not masquerade as a current verified snapshot either.
  const virtualSummary=$('shadowSaintSummaryBody');
  if(virtualSummary)virtualSummary.innerHTML='<tr><td colspan="8" class="muted">Virtual snapshot unavailable until verified refresh.</td></tr>';
  // Keep already-loaded same-scope history available for review, but label
  // it stale. A mode/reset change must never show the previous mode's rows.
  if(STATE&&capitalHistoryScope&&capitalHistoryScope!==capitalHistoryKey(STATE)){
    capitalHistoryScope=capitalHistoryKey(STATE);
    for(const kind of ['open','closed'])clearCapitalHistory(kind,capitalHistoryScope);
  }
  for(const kind of ['open','closed']){
    const ids=capitalHistoryIds(kind);
    setText(ids.count,'(total unavailable)');
    setText(ids.status,'Stale — current state unavailable. '+reason+' Previously loaded rows are not a current snapshot.');
  }
  setText('hunterSummary','Current capital totals unavailable; any retained history rows are last-known, not live.');
}
function currentDashboardStartMs(settings){return Number((settings?.mode==='LIVE'?settings?.liveDashboardStartMs:settings?.simulationDashboardStartMs)||0);}
function effectiveDashboardStartMs(settings){return Math.max(Number(settings?.resetTimestampMs||0),currentDashboardStartMs(settings));}
function financialScopeMatches(scope,settings){
  return !!scope&&!!settings&&['systemName','ownerId','mode'].every(k=>scope[k]!=null&&String(scope[k])===String(settings[k]))
    &&Number(scope.resetTimestampMs||0)===Number(settings.resetTimestampMs||0)
    &&Number(scope.dashboardStartMs||0)===currentDashboardStartMs(settings);
}
function lightningPerformance(s){
  const p=s.performance||{},a=p.byAttack?.['Lightning Plasma'];
  if(p.reportingVersion!=='APS2-LIGHTNING-REPORT-V1'||p.scope?.conceptName!=='Lightning Plasma'
    ||p.scope.executionClass!=='CAPITAL'||!financialScopeMatches(p.scope,s.settings)||!a)return {available:false};
  // Never fall back to legacy/combined totals, even during a mixed-version refresh.
  return {...p,...a,available:true,byAttack:{'Lightning Plasma':a}};
}
function isCapitalGreatHorn(e,settings){
 return e?.conceptName==='Great Horn Recovery'&&e?.executionClass==='CAPITAL'&&e?.archived!==true
   &&Number(e.openedAtMs||0)>=effectiveDashboardStartMs(settings)
   &&financialScopeMatches({systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetTimestampMs:settings.resetTimestampMs,dashboardStartMs:currentDashboardStartMs(settings)},settings);
}
// GH1 dashboard capability is the backend's financial reporting CONTRACT, not
// an exact, historical release-name string. A genuinely incompatible backend
// must still fail closed: no inferred balances, no Great Horn control writes.
const GH1_REQUIRED_SETTINGS=['greatHornEnabled','greatHornLinkEnabled','greatHornStakeCents',
  'greatHornMinEntryCents','greatHornMaxEntryCents','greatHornMaxSpreadCents','greatHornMultiply',
  'greatHornMinCrashCents','greatHornMinReboundCents','greatHornMinUpwardTicks',
  'greatHornObservationMinutes','greatHornParentEntryRiseCents',
  'greatHornAuroraDamageControlPercent','greatHornMinProfitNetPerOriginalContractCents',
  'greatHornAthenaX1Enabled'];
const capitalCounts=['open','closed','wins','losses','scratches','pending'];
const capitalPeriods=['day','week','month','year'];
function numericReportValue(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function verifiedGreatHornPerformance(s){
  const a=s?.greatHornPerformance,settings=s?.settings;
  if(!settings||!GH1_REQUIRED_SETTINGS.every(k=>Object.hasOwn(settings,k)))
    return {available:false,reason:'Great Horn operator settings are missing.'};
  if(!/^[a-f0-9]{64}$/i.test(String(s?.build?.sourceSha256||'')))
    return {available:false,reason:'The running source fingerprint is missing.'};
  if(a?.reportingVersion!=='GH1-CAPITAL-REPORT-V1'||a?.scope?.conceptName!=='Great Horn Recovery'
      ||a.scope.executionClass!=='CAPITAL'||!financialScopeMatches(a.scope,settings))
    return {available:false,reason:'The capital report version or owner/system/mode/reset scope does not match.'};
  if(!capitalCounts.every(k=>numericReportValue(a[k])&&Number(a[k])>=0)
      ||!numericReportValue(a.realizedCents)
      ||(a.valuationComplete!==false&&!numericReportValue(a.unrealizedCents)))
    return {available:false,reason:'The Great Horn capital report has incomplete core metrics.'};
  return {...a,available:true};
}
function gh1UiBackendCompatible(s){return verifiedGreatHornPerformance(s).available===true;}
// CW1 is a NEW capital recovery of Great Horn losses. It is NOT the historical
// CI1 Recovery Hunter, which also has a display name containing "Crystal Wall".
const CW1_REQUIRED_SETTINGS=['crystalWallRecoveryEnabled','crystalWallRecoveryLinkEnabled',
  'crystalWallRecoveryStakeCents','crystalWallRecoveryMinEntryCents','crystalWallRecoveryMaxEntryCents',
  'crystalWallRecoveryMaxSpreadCents','crystalWallRecoveryMultiply',
  'crystalWallRecoveryMinCrashCents','crystalWallRecoveryMinReboundCents',
  'crystalWallRecoveryMinUpwardTicks','crystalWallRecoveryObservationMinutes',
  'crystalWallRecoveryParentEntryRiseCents','crystalWallRecoveryAuroraDamageControlPercent',
  'crystalWallRecoveryMinProfitNetPerOriginalContractCents','crystalWallRecoveryAthenaX1Enabled'];
function isCapitalCrystalWallRecovery(e,settings){
 return e?.conceptName==='Crystal Wall Recovery'&&e?.executionClass==='CAPITAL'&&e?.archived!==true
   &&Number(e.openedAtMs||0)>=effectiveDashboardStartMs(settings)
   &&financialScopeMatches({systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetTimestampMs:settings.resetTimestampMs,dashboardStartMs:currentDashboardStartMs(settings)},settings);
}
function verifiedCrystalWallRecoveryPerformance(s){
 const a=s?.crystalWallRecoveryPerformance,settings=s?.settings;
 if(!settings||!CW1_REQUIRED_SETTINGS.every(k=>Object.hasOwn(settings,k)))
   return {available:false,reason:'Crystal Wall Recovery operator settings are missing.'};
 if(!/^[a-f0-9]{64}$/i.test(String(s?.build?.sourceSha256||'')))
   return {available:false,reason:'The running source fingerprint is missing.'};
 if(a?.reportingVersion!=='CW1-CAPITAL-REPORT-V1'||a?.scope?.conceptName!=='Crystal Wall Recovery'
     ||a.scope.executionClass!=='CAPITAL'||!financialScopeMatches(a.scope,settings))
   return {available:false,reason:'The Crystal Wall capital report version or system/owner/mode/reset scope does not match.'};
 if(!capitalCounts.every(k=>numericReportValue(a[k])&&Number(a[k])>=0)
     ||!numericReportValue(a.realizedCents)
     ||(a.valuationComplete!==false&&!numericReportValue(a.unrealizedCents)))
   return {available:false,reason:'The Crystal Wall capital report has incomplete core metrics.'};
 return {...a,available:true};
}
function cw1UiBackendCompatible(s){return verifiedCrystalWallRecoveryPerformance(s).available===true;}
// Seven independently verified capital reports. No shadow, legacy or partial
// fallback may impersonate the combined account-performance snapshot.
// A missing/reordered SC1 report fails closed exactly like a missing recovery.
function capitalCombinedPerformance(s){
  const reports=CAPITAL_ATTACK_REPORT_ROWS.map(([name,concept,code,key])=>({
    name,report:capitalAttackTableReport(s,concept,code,key)}));
  const unavailable=reports.find(({report})=>report.available!==true);
  if(unavailable)return {available:false,reason:`${unavailable.name} capital report unavailable: ${unavailable.report.reason||'unverified source, scope or snapshot'}`};
  const rows=reports.map(({report})=>report);
  const result={available:true,asOfMs:rows[0].asOfMs};
  for(const k of capitalCounts)result[k]=rows.reduce((sum,r)=>sum+Number(r[k]),0);
  result.winRate=result.closed>0?result.wins/result.closed:null;
  result.realizedCents=rows.reduce((sum,r)=>sum+Number(r.realizedCents),0);
  result.unreconciled=rows.reduce((sum,r)=>sum+Number(r.unreconciled||0),0);
  result.financialComplete=result.unreconciled===0&&rows.every(r=>r.financialComplete===true);
  result.valuationComplete=rows.every(r=>r.valuationComplete===true);
  result.unrealizedCents=result.valuationComplete
    ?rows.reduce((sum,r)=>sum+Number(r.unrealizedCents),0):null;
  for(const period of capitalPeriods){
    const key=period+'RealizedCents';
    result[key]=rows.every(r=>r.periodsComplete?.[period]===true&&numericReportValue(r[key]))
      ?rows.reduce((sum,r)=>sum+Number(r[key]),0):null;
  }
  return result;
}
function renderCapitalCombined(s){
  const c=capitalCombinedPerformance(s),valid=c.available===true;
  const put=(id,value)=>setText(id,valid?value:'Unavailable');
  put('capitalCombinedWinRate',c.closed?pct01(c.winRate):'-');
  put('capitalCombinedOpen',c.open);put('capitalCombinedClosed',c.closed);
  put('capitalCombinedWinsLosses',`${c.wins} / ${c.losses}`);
  put('capitalCombinedPending',c.pending);
  for(const [id,key] of [
    ['capitalCombinedRealized','realizedCents'],['capitalCombinedUnrealized','unrealizedCents'],
    ['capitalCombinedToday','dayRealizedCents'],['capitalCombinedWeek','weekRealizedCents'],
    ['capitalCombinedMonth','monthRealizedCents'],['capitalCombinedYear','yearRealizedCents']])
    setFinancialPnl(id,valid?c[key]:null);
  setText('capitalCombinedFinancialStatus',valid
    ?'Combined: Chain 1, Chain 2, and Starlight Extinction, same owner, system, mode, reset and snapshot. Only funded Starlight positions are included; shadow Starlight is excluded. '+
      (c.financialComplete===false?`${c.unreconciled} funded position(s) still require broker reconciliation. Shown realized profit includes recorded closures and partial exits; complete account results are pending. `:'')+
      (c.valuationComplete?'Open counts are ledger positions, not a live broker-inventory confirmation; bid marks do not guarantee liquidation.':'Unrealized P/L is unavailable because one or more capital marks are incomplete.')
    :'Combined capital results unavailable: '+c.reason+' No cross-scope or legacy total is substituted.');
}
function actualAccountBalances(s){
  const a=s.accountBalances;
  return a?.scope==='ACTUAL_ACCOUNT_INCLUDING_LEGACY'&&financialScopeMatches(a,s.settings)?a:{};
}
const ATTACKS=[
  {legacy:'Athena Exclamation',name:'Athena Exclamation',key:'athenaExclamationEnabled',x1:'athenaExclamationAthenaX1Enabled',stake:'athenaExclamationStakeCents',min:'athenaExclamationMinEntryCents',max:'athenaExclamationMaxEntryCents',multiply:'athenaExclamationMultiply',fields:[['athenaExclamationMinCrashCents','Min crash','c'],['athenaExclamationMinReboundCents','Min rebound','c'],['athenaExclamationMinUpwardTicks','Upward ticks',''],['athenaExclamationObservationMinutes','Observe','min'],['athenaExclamationMinProfitNetPerOriginalContractCents','Min profit target','c']],desc:'Athena Exclamation SHADOW pattern signal. Existing crash/rebound/ticks, profit and X1/Infinity settings remain unchanged.'},
  {legacy:'Crash Recovery Hunter',name:'Starlight Extinction',key:'crashRecoveryHunterEnabled',real:'starlightExtinctionRealTradeEnabled',x1:'crashRecoveryHunterAthenaX1Enabled',stake:'crashRecoveryStakeCents',min:'crashRecoveryMinEntryCents',max:'crashRecoveryMaxEntryCents',multiply:'crashRecoveryHunterMultiply',fields:[['athenaExclamationStarlightTriggerCents','Athena +c to enter','c'],['crashRecoveryHunterMinCrashCents','Min crash','c'],['crashRecoveryHunterMinReboundCents','Min rebound','c'],['crashRecoveryHunterMinUpwardTicks','Upward ticks',''],['crashRecoveryHunterObservationMinutes','Observe','min'],['crashRecoveryHunterMinProfitNetPerOriginalContractCents','Min profit target','c'],['crashRecoveryHunterAuroraDamageControlPercent','Aurora %','%']],desc:'Recovery after a verified stop. Real-trade switch OFF keeps it a shadow with no broker order. ON opens it as a real capital trade using this card stake, in simulation and live. Editable Athena +c to enter on this Starlight card (0 disables extra rise trigger). Lightning Plasma shadow losses never authorize recovery. Own Aurora and X1/Infinity choice preserved.'},
  {legacy:'Lightning Plasma',name:'Lightning Plasma',key:'lightningPlasmaEnabled',real:'starlightExtinctionRealTradeEnabled',x1:'crashRecoveryHunterAthenaX1Enabled',stake:'crashRecoveryStakeCents',min:'crashRecoveryMinEntryCents',max:'crashRecoveryMaxEntryCents',multiply:'crashRecoveryHunterMultiply',fields:[['athenaExclamationStarlightTriggerCents','Athena +c to enter','c'],['crashRecoveryHunterMinCrashCents','Min crash','c'],['crashRecoveryHunterMinReboundCents','Min rebound','c'],['crashRecoveryHunterMinUpwardTicks','Upward ticks',''],['crashRecoveryHunterObservationMinutes','Observe','min'],['crashRecoveryHunterMinProfitNetPerOriginalContractCents','Min profit target','c'],['crashRecoveryHunterAuroraDamageControlPercent','Aurora %','%']],desc:'Exact Starlight settings. Enters on the same Athena hard stop. A verified Plasma loss still arms Great Horn, then Crystal Wall.'},
  {legacy:'Great Horn Recovery',name:'Great Horn',key:'greatHornEnabled',x1:'greatHornAthenaX1Enabled',stake:'greatHornStakeCents',min:'greatHornMinEntryCents',max:'greatHornMaxEntryCents',multiply:'greatHornMultiply',fields:[['greatHornMinCrashCents','Min crash','c'],['greatHornMinReboundCents','Min rebound','c'],['greatHornMinUpwardTicks','Upward ticks',''],['greatHornObservationMinutes','Observe','min'],['greatHornMaxSpreadCents','Max spread','c'],['greatHornParentEntryRiseCents','Lightning entry +c','c'],['greatHornMinProfitNetPerOriginalContractCents','Min profit target','c'],['greatHornAuroraDamageControlPercent','Aurora %','%']],desc:'GH1 recovery of verified Lightning losses. Independent Link / crash / rebound / upticks / observation / original Lightning entry +c / Aurora / profit model. SIM code present; LIVE is release-gated pending native deployment proof.'},
  {legacy:'Crystal Wall Recovery',name:'Crystal Wall Recovery',key:'crystalWallRecoveryEnabled',x1:'crystalWallRecoveryAthenaX1Enabled',stake:'crystalWallRecoveryStakeCents',min:'crystalWallRecoveryMinEntryCents',max:'crystalWallRecoveryMaxEntryCents',multiply:'crystalWallRecoveryMultiply',fields:[['crystalWallRecoveryMinCrashCents','Min crash','c'],['crystalWallRecoveryMinReboundCents','Min rebound','c'],['crystalWallRecoveryMinUpwardTicks','Upward ticks',''],['crystalWallRecoveryObservationMinutes','Observe','min'],['crystalWallRecoveryMaxSpreadCents','Max spread','c'],['crystalWallRecoveryParentEntryRiseCents','Great Horn entry +c','c'],['crystalWallRecoveryMinProfitNetPerOriginalContractCents','Min profit target','c'],['crystalWallRecoveryAuroraDamageControlPercent','Aurora %','%']],desc:'CW1 capital recovery of verified Great Horn losses; separate durable parent, seats, Link, max spread, Aurora, X1/Infinity, Multiply, P/L and closed-trade accounting. Existing Great Horn behavior unchanged. New CW1 LIVE buys are independently release-gated.'},
  {legacy:'Sagittarius Arrow Recovery',name:'Sagittarius Arrow',key:'sagittariusArrowEnabled',real:'starlightExtinctionRealTradeEnabled',x1:'crashRecoveryHunterAthenaX1Enabled',stake:'crashRecoveryStakeCents',min:'crashRecoveryMinEntryCents',max:'crashRecoveryMaxEntryCents',multiply:'crashRecoveryHunterMultiply',fields:[['athenaExclamationStarlightTriggerCents','Athena +c to enter','c'],['crashRecoveryHunterMinCrashCents','Min crash','c'],['crashRecoveryHunterMinReboundCents','Min rebound','c'],['crashRecoveryHunterMinUpwardTicks','Upward ticks',''],['crashRecoveryHunterObservationMinutes','Observe','min'],['crashRecoveryHunterMinProfitNetPerOriginalContractCents','Min profit target','c'],['crashRecoveryHunterAuroraDamageControlPercent','Aurora %','%']],desc:'Exact Starlight settings. Enters on the same Athena hard stop. A verified Arrow loss still arms Scarlet Needle, then Pegasus.'},
  {legacy:'Scarlet Needle Recovery',name:'Scarlet Needle',key:'scarletNeedleCapitalEnabled',x1:'scarletNeedleCapitalAthenaX1Enabled',stake:'scarletNeedleCapitalStakeCents',min:'scarletNeedleCapitalMinEntryCents',max:'scarletNeedleCapitalMaxEntryCents',multiply:'scarletNeedleCapitalMultiply',fields:[['scarletNeedleCapitalMinCrashCents','Min crash','c'],['scarletNeedleCapitalMinReboundCents','Min rebound','c'],['scarletNeedleCapitalMinUpwardTicks','Upward ticks',''],['scarletNeedleCapitalObservationMinutes','Observe','min'],['scarletNeedleCapitalMaxSpreadCents','Max spread','c'],['scarletNeedleCapitalParentEntryRiseCents','Sagittarius Arrow CAPITAL entry +c','c'],['scarletNeedleCapitalMinProfitNetPerOriginalContractCents','Min profit target','c'],['scarletNeedleCapitalAuroraDamageControlPercent','Aurora %','%']],desc:'CHAIN 2 SN2: independent Great Horn-style capital recovery of verified Sagittarius Arrow CAPITAL loss. Immutable identity, frozen own Aurora, multiple seats, durable parent and financial proof. LIVE release gated.'},
  {legacy:'Pegasus Ryu Sei Ken Recovery',name:'Pegasus Ryu Sei Ken',key:'pegasusRyuSeiKenCapitalEnabled',x1:'pegasusRyuSeiKenCapitalAthenaX1Enabled',stake:'pegasusRyuSeiKenCapitalStakeCents',min:'pegasusRyuSeiKenCapitalMinEntryCents',max:'pegasusRyuSeiKenCapitalMaxEntryCents',multiply:'pegasusRyuSeiKenCapitalMultiply',fields:[['pegasusRyuSeiKenCapitalMinCrashCents','Min crash','c'],['pegasusRyuSeiKenCapitalMinReboundCents','Min rebound','c'],['pegasusRyuSeiKenCapitalMinUpwardTicks','Upward ticks',''],['pegasusRyuSeiKenCapitalObservationMinutes','Observe','min'],['pegasusRyuSeiKenCapitalMaxSpreadCents','Max spread','c'],['pegasusRyuSeiKenCapitalParentEntryRiseCents','Scarlet Needle CAPITAL entry +c','c'],['pegasusRyuSeiKenCapitalMinProfitNetPerOriginalContractCents','Min profit target','c'],['pegasusRyuSeiKenCapitalAuroraDamageControlPercent','Aurora %','%']],desc:'CHAIN 2 PR3: independent Great Horn-style capital recovery of verified Scarlet Needle CAPITAL loss. Immutable identity, frozen own Aurora, multiple seats, durable parent and financial proof. LIVE release gated.'},
];
const COSMOS=[
  {legacy:'Pegasus',name:'Pegasus',key:'pegasusEnabled',desc:'Broker-free shadow trader using Pegasus drop/stability qualification.',fields:[['pegasusReferenceStakeCents','Reference stake','c'],['pegasusMinPriceCents','Min price','c'],['pegasusMaxPriceCents','Max price','c'],['pegasusDropCents','Drop','c']]},
  {legacy:'Dragon',name:'Dragon',key:'dragonEnabled',desc:'Broker-free shadow trader using Dragon crash/recovery qualification.',fields:[['dragonReferenceStakeCents','Reference stake','c'],['dragonMinSignalPriceCents','Min signal','c'],['dragonMaxSignalPriceCents','Max signal','c'],['dragonMaxEpisode','Max episode','']]},
  {legacy:'Phoenix',name:'Phoenix',key:'phoenixEnabled',desc:'Broker-free shadow trader using confirmed multi-tick upward ignition.',fields:[['phoenixReferenceStakeCents','Reference stake','c'],['phoenixMinPriceCents','Min price','c'],['phoenixMaxPriceCents','Max price','c']]},
  {legacy:'Gemini',name:'Gemini',key:'geminiEnabled',desc:'Isolated shadow universe. Another Dimension is the full virtual Attack inside Gemini; it uses no broker money and no simulation portfolio money and no longer authorizes Sagittarius Justice Arrow.',fields:[['geminiReferenceStakeCents','Virtual stake','c'],['geminiMinPriceCents','Min price','c'],['geminiMaxPriceCents','Max price','c']]},
];
const SHARED=[
 ['maxPositions','Max Attack Positions',''],['maxEntriesPerTrade','Max Entries / Event',''],['hunterCooldownMinutes','Shared Attack Cooldown','min'],['minGameMinutes','Minimum Game Minutes','min'],['maxGameMinutes','Maximum Game Minutes','min'],['eventCooldownMinutes','Cosmo Event Cooldown','min'],['maxSpreadCents','Shared Max Spread','c'],['startingCapitalCents','Simulation Starting Capital','c'],['simFeeCents','Simulation Fee / Contract','c'],['recoveryTrackingHours','Recovery Research Tracking','h'],
];
const drafts=new Map();
// Dedicated panels share the same draft lifecycle as Saint/Cosmo cards. A
// streamed state snapshot is not authorization to discard an unsaved edit.
const PANEL_SETTING_IDS={atomicThunderGreenTrigger:'atomicThunderGreenTriggerCents',
  infinityMinNet:'infinityBreakMinNetPerOriginalContractCents',infinityConfirmations:'infinityBreakRequiredConfirmations',
  infinityBookAge:'infinityBreakMaximumBookAgeMs',infinityWindow:'infinityBreakConfirmationWindowMs',
  auroraDamagePercent:'auroraDamageControlPercent',freezingCoffinDrop:'freezingCoffinMaxDropCents',systemNameInput:'systemName'};
function renderSettingInput(id,key,saved){const input=$(id);if(input&&!input.matches(':focus'))input.value=drafts.has(key)?drafts.get(key):saved;}
function acknowledgeSavedDrafts(data){for(const [key,value] of Object.entries(data)){
  if(!drafts.has(key))continue;
  const draft=drafts.get(key);
  // A second edit made while PATCH is in flight is a NEW unsaved draft.
  const same=typeof value==='number'?String(draft).trim()!==''&&Number.isFinite(Number(draft))&&Number(draft)===value:String(draft)===String(value);
  if(same)drafts.delete(key);
}}
for(const [id,key] of Object.entries(PANEL_SETTING_IDS))$(id)?.addEventListener('input',event=>drafts.set(key,event.target.value));
function inputHtml(key,label,value,suffix='',step=1,minVal=null){
  const v=drafts.has(key)?drafts.get(key):value;
  let minimum=minVal,maximum=null,required=true,title='';
  if(/Multiply$/.test(key)){minimum=1;maximum=20;}
  else if(/[aA]uroraDamageControlPercent$/.test(key)){minimum=1;maximum=95;step='any';}
  else if(/MaxRepeats$/.test(key)){minimum=0;maximum=1;}
  else if(/MaxStrikes$/.test(key)){minimum=1;}
  else if(/ObservationMinutes$/.test(key)){minimum=0;maximum=1000;}
  else if(/MinProfitNetPerOriginalContractCents$|InfinityNetPerOriginalContractCents$/.test(key)){minimum=0.01;maximum=99;step='any';}
  else if(key==='greatHornMaxSpreadCents'){minimum=0;maximum=99;title='Great Horn entry-only maximum bid-ask spread; does not change the shared spread or exit protection.';}
  else if(key==='crystalWallRecoveryMaxSpreadCents'){minimum=0;maximum=99;title='Crystal Wall Recovery independent entry-only maximum bid-ask spread; does not change Great Horn, the shared spread or protective exits.';}
  else if(/^(?:sagittariusArrow|scarletNeedleCapital|pegasusRyuSeiKenCapital)MaxSpreadCents$/.test(key)){minimum=0;maximum=99;title='This recovery attack\'s independent entry-only maximum bid-ask spread; does not change other stages, the shared spread or protective exits.';}
  else if(/MinCrashCents$|MinReboundCents$/.test(key)){minimum=0;maximum=99;}
  else if(/MinUpwardTicks$/.test(key)){minimum=0;maximum=20;}
  else if(/MinEntryCents$|MaxEntryCents$|MinPriceCents$|MaxPriceCents$/.test(key)){minimum=1;maximum=99;}
  else if(/StakeCents$/.test(key)){minimum=0.01;step='any';}
  if(key==='lightningPlasmaStarlightScaleInCents'){minimum=0;maximum=50;title='Rise above the OPEN real-capital Starlight entry; Plasma must also pass its own crash, rebound, ticks and entry band. 0 disables continuation.';}
  if(key==='athenaExclamationStarlightTriggerCents'){minimum=0;maximum=99;title='Rise above original Athena entry after a verified shadow loss. 0 preserves the previous Starlight route.';}
  return `<label>${esc(label)}<span><input data-setting-key="${esc(key)}" type="number" step="${step}"${required?' required':''}${minimum==null?'':` min="${minimum}"`}${maximum==null?'':` max="${maximum}"`}${title?` title="${esc(title)}"`:''} value="${esc(v??'')}"><em>${esc(suffix)}</em></span></label>`;
}
function attackControlsHtml(s,a){let h=inputHtml(a.stake,'Stake',s.settings?.[a.stake],'c',1)+inputHtml(a.min,'Min entry',s.settings?.[a.min],'c',1)+inputHtml(a.max,'Max entry',s.settings?.[a.max],'c',1);for(const [k,l,u] of (a.fields||[]))h+=inputHtml(k,l,s.settings?.[k],u,1,/Min crash|Min rebound|Upward ticks/.test(l)?0:null);if(a.rays)h+=inputHtml(a.rays,'Max rays',s.settings?.[a.rays],'',1);if(a.multiply)h+=inputHtml(a.multiply,'Multiply',s.settings?.[a.multiply],'',1);if(a.repeats)h+=inputHtml(a.repeats,'Max repeats',s.settings?.[a.repeats],'',1);if(a.real){const real=s.settings?.[a.real]===true;h+=`<label>Execution<span><button class="model-toggle ${real?'enabled':'disabled'}" type="button" data-model-key="${esc(a.real)}" data-model-name="${esc(a.name)} real trade" data-enabled="${real}">${real?'REAL TRADE':'SHADOW'}</button></span></label>`;}
    if(a.x1){const on=s.settings?.[a.x1]===true;h+=`<label>Profit model<span><button class="model-toggle ${on?'enabled':'disabled'}" type="button" data-model-key="${esc(a.x1)}" data-model-name="${esc(a.name)} X1" data-enabled="${on}">${on?'ATHENA X1':'INFINITY'}</button></span></label>`;}if(a.legacy==='Great Horn Recovery'){const link=s.settings?.greatHornLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="greatHornLinkEnabled" data-model-name="Great Horn Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Crystal Wall Recovery'){const link=s.settings?.crystalWallRecoveryLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="crystalWallRecoveryLinkEnabled" data-model-name="Crystal Wall Recovery Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Scarlet Needle Recovery'){const link=s.settings?.scarletNeedleCapitalLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="scarletNeedleCapitalLinkEnabled" data-model-name="Scarlet Needle Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Pegasus Ryu Sei Ken Recovery'){const link=s.settings?.pegasusRyuSeiKenCapitalLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="pegasusRyuSeiKenCapitalLinkEnabled" data-model-name="Pegasus Ryu Sei Ken Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Crash Recovery Hunter'||a.legacy==='Lightning Plasma'||a.legacy==='Sagittarius Arrow Recovery'){const link=s.settings?.crashRecoveryHunterLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="crashRecoveryHunterLinkEnabled" data-model-name="Starlight Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}let authority=a.legacy==='Crash Recovery Hunter'?'Verified Athena SHADOW stop -> Starlight. Link ON immediately evaluates a capital or shadow seat, subject to execution safety; Link OFF waits for Starlight own crash, rebound, ticks and band. Real Trade ON uses capital; OFF remains shadow.':'Strategic qualification: ATHENA ONLY · optional crash/rebound/ticks · X1 or Infinity';if(a.legacy==='Great Horn Recovery')authority='GH1 RELEASE CANDIDATE — NOT DEPLOYMENT CERTIFIED: Link ON immediately evaluates after a verified Lightning loss and bypasses Observe, crash, rebound, ticks, Lightning +c, the Great Horn operator entry band and the old exit-price ceiling; financial book, liquidity, spread and capital checks are ALWAYS enforced. Link OFF follows the full configured recovery card. Durable SIM entry and guarded LIVE pending-order/exit code. LIVE orders fail closed unless the native infrastructure release gate is explicitly verified. Operator must not run unverified capital execution; existing positions retain protection. Historical Momentum Hunter identity is preserved.';if(a.legacy==='Crystal Wall Recovery')authority='CW1 SECOND-LEVEL RECOVERY: A financially verified CLOSED losing Great Horn capital parent arms an independent Crystal Wall Recovery watch. Link ON bypasses recovery-pattern and operator-price-band checks, never spread/depth/fees/capital protections. Link OFF follows its own configured card. No recursive recovery. New LIVE BUYs are fail-closed by an independent release gate.';if(a.legacy==='Scarlet Needle')authority='Strategic qualification: ATHENA ONLY · Cosmo GREEN → Bolt → FIRE · optional crash/rebound/ticks · X1 or Infinity';if(a.legacy==='Lightning Plasma')authority='Chain 1: ONLY an OPEN real CAPITAL Starlight parent may authorize Plasma after Starlight +c and Plasma crash/rebound/ticks/band. Own stake/Aurora/X1/Infinity and exits. Plasma verified loss -> Great Horn -> Crystal Wall. Plasma never arms Starlight.';if(a.legacy==='Athena Exclamation'||a.legacy==='Sagittarius Justice Arrow')authority='Independent CI1 crash-rebound · own crash/rebound/ticks · X1 or Infinity · Aurora';if(a.legacy==='Crash Recovery Hunter'&&Number(s.settings?.athenaExclamationStarlightTriggerCents||0)>0)authority='Starlight follows a verified Athena shadow stop. Link ON bypasses entry geometry; Link OFF respects configured Starlight qualification and band. Its independent Aurora and execution safeguards are mandatory.';if(a.legacy==='Crash Recovery Hunter')authority+=` | Athena +c to enter: ${Number(s.settings?.athenaExclamationStarlightTriggerCents||0)}c (edit and Save here on Starlight; 0 = original behavior). After a VERIFIED Athena shadow loss, compare current bid to ORIGINAL Athena entry. With a positive trigger use Starlight own live entry band, not the old stop-price ceiling. Other parents unchanged.`;if(a.legacy==='Crash Recovery Hunter'||a.legacy==='Lightning Plasma')authority+=' | X1 uses this card minimum profit; INFINITY uses the shared Infinity Break target.';if(a.legacy==='Lightning Plasma')authority='Starlight clone. Same settings, same Athena hard-stop entry. A verified Plasma loss still arms Great Horn.';if(a.legacy==='Sagittarius Arrow Recovery')authority='Starlight clone. Same settings, same Athena hard-stop entry. A verified Arrow loss still arms Scarlet Needle.';if(a.legacy==='Scarlet Needle Recovery')authority='CHAIN 2 SECOND RECOVERY: Requires fully reconciled negative-net Sagittarius Arrow CAPITAL loss. Legacy Scarlet Needle signals are never accepted. Link ON bypasses only recovery signal qualification; financial safeguards remain mandatory. LIVE entries are separately release-gated.';if(a.legacy==='Pegasus Ryu Sei Ken Recovery')authority='CHAIN 2 TERMINAL RECOVERY: Requires fully reconciled negative-net NEW Scarlet Needle CAPITAL loss. No further recovery follows a Pegasus Ryu Sei Ken loss. Legacy Wave Surfer cannot authorize this stage. Financial safeguards and separate LIVE release gate always apply.';return `<div class="model-settings">${h}<button class="btn light model-save" data-model-save="${esc(a.legacy)}">Save</button></div><div class="attack-authority-note">${authority}</div>`;}
function cosmoControlsHtml(s,c){const fields=c.fields||[];const controls=fields.length?`<div class="model-settings">${fields.map(([k,l,u])=>inputHtml(k,l,s.settings?.[k],u,1)).join('')}<button class="btn light model-save" data-model-save="${esc(c.name)}">Save</button></div>`:'';const note=c.legacy==='Gemini'?'GEMINI UNIVERSE · ANOTHER DIMENSION ATTACK · no broker order · no real/simulation portfolio capital': 'SHADOW TRADE ONLY · no broker order · no real portfolio capital';return `${controls}<div class="attack-authority-note">${note}</div>`;}
function statFor(s,name){return (s.conceptStats||[]).find(x=>x.name===name)||{};}
function renderSettings(s){const f=$('settingsForm');if(!f)return;f.innerHTML=SHARED.map(([k,l,u])=>{const step=1;const v=drafts.has(k)?drafts.get(k):s.settings?.[k];return `<label>${esc(l)}<input data-setting-key="${esc(k)}" name="${esc(k)}" type="number" step="${step}" value="${esc(v??'')}"><small>${esc(u)}</small></label>`;}).join('');}
// Financial statistics must never share the editing lifecycle of Attack controls.
// Great Horn's source of truth is the same scope-verified capital report used
// by its separate financial panel; its legacy conceptStats row can lag behind.
// Verifiable, current-reset SHADOW report. It never supplies capital P/L,
// cash balances, recovery admissions, or trading controls. A missing verified
// shadow snapshot is UNKNOWN, not zero. An absent concept in a verified full
// byConcept aggregate means zero entries in the current reset epoch.
const SHADOW_CARD_NAMES=new Set(['Athena Exclamation','Crash Recovery Hunter','Lightning Plasma']);
function shadowAttackDisplayMetrics(s,a){
  const missing={available:false,avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',
    wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted',note:'VIRTUAL · current-reset snapshot unavailable'};
  if(!SHADOW_CARD_NAMES.has(a.legacy))return missing;
  const d=s?.shadowDiagnostics,summary=d?.summary,scope=d?.scope,reportScope=summary?.scope,settings=s?.settings;
  if(d?.classification!=='VIRTUAL_ONLY'||summary?.classification!=='VIRTUAL_ONLY'
    ||!scope||!reportScope||!settings||d.error
    ||!['systemName','ownerId','mode'].every(k=>String(scope[k])===String(settings[k])
      &&String(reportScope[k])===String(settings[k]))
    ||!Number.isSafeInteger(Number(settings.resetTimestampMs))
    ||Number(scope.resetEpoch)!==Number(settings.resetTimestampMs)
    ||Number(reportScope.resetEpoch)!==Number(settings.resetTimestampMs)
    ||!summary.byConcept||typeof summary.byConcept!=='object')return missing;
  const r=summary.byConcept[a.legacy]||{classification:'VIRTUAL_ONLY',total:0,open:0,closed:0,
    wins:0,losses:0,realizedCents:0,unrealizedCents:0,avgEntryCents:0};
  if(r.classification!=='VIRTUAL_ONLY'
    ||!['total','open','closed','wins','losses'].every(k=>Number.isSafeInteger(Number(r[k]))&&Number(r[k])>=0)
    ||Number(r.total)<Number(r.open)+Number(r.closed)
    ||Number(r.wins)+Number(r.losses)>Number(r.closed)
    ||!['realizedCents','unrealizedCents','avgEntryCents'].every(k=>numericReportValue(r[k])))return missing;
  const realized=Number(r.realizedCents),unrealized=Number(r.unrealizedCents);
  return {available:true,avg:Number(r.total)>0?pc(r.avgEntryCents):'-',entries:String(r.total),open:String(r.open),
    closed:String(r.closed),wl:`${r.wins} / ${r.losses}`,rate:Number(r.closed)>0?pct01(Number(r.wins)/Number(r.closed)):'-',
    pnl:money(realized),pnlClass:pnlClass(realized),
    note:`VIRTUAL ONLY · closed net ${money(realized)} · open mark ${money(unrealized)} · neither affects capital P/L`};
}
// Virtual Shadow Saints aggregates are displayed in the dedicated research
// section, never as additional capital/attack rows or Cosmos references.
function renderShadowSaintSummary(s){
  const body=$('shadowSaintSummaryBody');if(!body)return;
  const labels=[['Athena Exclamation','Athena Exclamation'],['Crash Recovery Hunter','Starlight Extinction'],['Lightning Plasma','Lightning Plasma']];
  body.innerHTML=labels.map(([legacy,label])=>{
    const metrics=shadowAttackDisplayMetrics(s,{legacy});
    const cells=ATTACK_METRIC_KEYS.map(key=>`<td${key==='pnl'?` class="${esc(metrics.pnlClass)}"`:''}>${esc(metrics[key])}</td>`).join('');
    return `<tr><td>${esc(label)}</td>${cells}</tr>`;
  }).join('');
}
function attackDisplayMetrics(s,a){
  // Athena Exclamation is intentionally SHADOW ONLY. Do not mislabel its
  // virtual movement as executed capital or let conceptStats invent capital.
  if(a.legacy==='Athena Exclamation'){
    // Athena is SHADOW ONLY: its verified virtual measurements are the main
    // attack-card statistics. They never enter the capital performance report.
    const m=shadowAttackDisplayMetrics(s,a);
    return {...m,classification:m.available?'VIRTUAL_ONLY':'UNAVAILABLE'};
  }
  if(a.legacy==='Crash Recovery Hunter'){
    // SC1: the active Starlight card is funded capital whenever REAL TRADE was
    // enabled for a position. Historic/current shadow results belong exclusively
    // to the separate SHADOW SAINTS research table, never financial P/L.
    const p=capitalAttackTableReport(s,'Crash Recovery Hunter','SC1','starlightCapitalPerformance');
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {avg:Number(p.total)===0?'-':numericReportValue(p.avgEntryCents)?pc(p.avgEntryCents):'Unavailable',
      entries:String(p.total),open:String(p.open),closed:String(p.closed),wl:`${p.wins} / ${p.losses}`,
      rate:Number(p.closed)>0?pct01(Number(p.wins)/Number(p.closed)):'-',
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)};
  }
  if(a.legacy==='Lightning Plasma'){
    // A legacy conceptStats row may include virtual Lightning observations;
    // only the verified Lightning CAPITAL report belongs in this card.
    const p=capitalAttackTableReport(s,'Lightning Plasma','LP1','performance');
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {avg:Number(p.total)===0?'-':numericReportValue(p.avgEntryCents)?pc(p.avgEntryCents):'Unavailable',
      entries:numericReportValue(p.total)?String(p.total):'Unavailable',
      open:String(p.open),closed:String(p.closed),wl:`${p.wins} / ${p.losses}`,
      rate:Number(p.closed)>0?pct01(Number(p.wins)/Number(p.closed)):'-',
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)};
  }
  if(a.legacy==='Great Horn Recovery'){
    const p=capitalAttackTableReport(s,'Great Horn Recovery','GH1','greatHornPerformance');
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {
      avg:numericReportValue(p.avgEntryCents)?pc(p.avgEntryCents):'Unavailable',
      entries:numericReportValue(p.total)?String(p.total):'Unavailable',
      open:String(p.open),closed:String(p.closed),wl:`${p.wins} / ${p.losses}`,
      rate:pct01(Number(p.closed)>0?Number(p.wins)/Number(p.closed):0),
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)
    };
  }
  if(a.legacy==='Crystal Wall Recovery'){
    const p=capitalAttackTableReport(s,'Crystal Wall Recovery','CW1','crystalWallRecoveryPerformance');
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {avg:Number(p.total)===0?'-':numericReportValue(p.avgEntryCents)?pc(p.avgEntryCents):'Unavailable',
      entries:numericReportValue(p.total)?String(p.total):'Unavailable',
      open:String(p.open),closed:String(p.closed),wl:`${p.wins} / ${p.losses}`,
      rate:Number(p.closed)>0?pct01(Number(p.wins)/Number(p.closed)):'-',
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)};
  }
  if(['Sagittarius Arrow Recovery','Scarlet Needle Recovery','Pegasus Ryu Sei Ken Recovery'].includes(a.legacy)){
    const key={'Sagittarius Arrow Recovery':'sagittariusArrowPerformance',
      'Scarlet Needle Recovery':'scarletNeedleCapitalPerformance',
      'Pegasus Ryu Sei Ken Recovery':'pegasusRyuSeiKenCapitalPerformance'}[a.legacy];
    // Use the same verified capital-report contract as the seven-attack results
    // table. A legacy/mismatched/unversioned report must not appear as valid
    // earnings in the attack card while its financial table says Unavailable.
    const code={'Sagittarius Arrow Recovery':'SA1',
      'Scarlet Needle Recovery':'SN2',
      'Pegasus Ryu Sei Ken Recovery':'PR3'}[a.legacy];
    const p=capitalAttackTableReport(s,a.legacy,code,key);
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {avg:Number(p.total)===0?'-':pc(p.avgEntryCents),entries:String(p.total),open:String(p.open),closed:String(p.closed),
      wl:`${p.wins} / ${p.losses}`,rate:Number(p.closed)>0?pct01(Number(p.wins)/Number(p.closed)):'-',
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)};
  }
  // The optional concept aggregate may be unavailable even while the
  // authoritative capital snapshot is sound. Never turn recent-only sampled
  // history into a supposed complete zero or a verified shadow statistic.
  if(s.conceptAggregateComplete===false)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
  const st=statFor(s,a.legacy);
  const marked=a.legacy==='Crash Recovery Hunter';
  const wins=marked&&!(st.closed>0)?(st.openWins||0):(st.wins||0);
  const losses=marked&&!(st.closed>0)?(st.openLosses||0):(st.losses||0);
  const rated=(st.closed>0?st.closed:wins+losses);
  return {avg:pc(st.avgEntryCents),entries:String(st.total||0),open:String(st.open||0),
    closed:String(st.closed||0),wl:`${wins}/${losses}`,
    rate:rated>0?pct01(wins/rated):pct01(st.winRate),pnl:money(st.pnlCents),pnlClass:pnlClass(st.pnlCents)};
}
const ATTACK_METRIC_KEYS=['avg','entries','open','closed','wl','rate','pnl'];
function renderAttacks(s){
  const b=$('attackBody');if(!b)return;
  b.innerHTML=ATTACKS.map((a,i)=>{
    const group=i===0?'SHARED SHADOW SIGNALS':i===2?'CHAIN 1 — LIGHTNING PLASMA RECOVERY':i===5?'CHAIN 2 — ARROW CLONE AND RECOVERY':null;
    const heading=group?`<tr class="attack-group-row"><th colspan="10" scope="rowgroup">${esc(group)}</th></tr>`:'';
    const enabled=s.settings?.[a.key]===true,m=attackDisplayMetrics(s,a);
    const cells=ATTACK_METRIC_KEYS.map(key=>`<td data-attack-metric="${key}"${key==='pnl'?` class="${esc(m.pnlClass)}"`:''}>${esc(m[key])}</td>`).join('');
    const cw=a.legacy==='Crystal Wall Recovery';
    const label=i===0?'SHADOW / VIRTUAL ONLY · CAPITAL N/A':i===1?'CAPITAL STARLIGHT · VIRTUAL IN SHADOW SAINTS':i===2?'CHAIN 1 · CAPITAL · VIRTUAL IN SHADOW SAINTS':i<5?'CHAIN 1 · CAPITAL RECOVERY':i===5?'CHAIN 2 · CAPITAL CLONE':'CHAIN 2 · CAPITAL RECOVERY';
    const primary=heading+`<tr data-attack-index="${i}"${cw?' id="crystalWallRecoverySettings"':''} class="${enabled?'':'model-disabled'}${cw?' cw-recovery-row':''}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(a.name)}</div><div class="legacy-name">${esc(label)}${i>2?' · LIVE ENTRY RELEASE GATED':''}</div><div class="concept-desc">${esc(a.desc)}</div>${i===0?`<div class="shadow-inline-note" data-shadow-note>${esc(m.note)}</div>`:''}${attackControlsHtml(s,a)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(a.key)}" data-model-name="${esc(a.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td>${cells}</tr>`;
    return primary;
  }).join('');
}
function renderAttackMetrics(s){
  const b=$('attackBody');if(!b)return;
  for(const [i,a] of ATTACKS.entries()){
    const row=b.querySelector(`tr[data-attack-index="${i}"]`);if(!row)continue;
    const m=attackDisplayMetrics(s,a);
    for(const key of ATTACK_METRIC_KEYS){
      const cell=row.querySelector(`[data-attack-metric="${key}"]`);if(!cell)continue;
      const value=String(m[key]);if(cell.textContent!==value)cell.textContent=value;
      if(key==='pnl'&&cell.className!==m.pnlClass)cell.className=m.pnlClass;
    }
    if(a.legacy==='Athena Exclamation'){
      const note=row.querySelector('[data-shadow-note]');
      if(note&&note.textContent!==m.note)note.textContent=m.note;
    }

  }
}
function renderCosmos(s){const b=$('cosmoBody');if(!b)return;b.innerHTML=COSMOS.map((c,i)=>{if(s.conceptAggregateComplete===false&&c.legacy!=='Gemini'){const enabled=s.settings?.[c.key]===true;return `<tr class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(c.name)}</div><div class="concept-desc">${esc(c.desc||'Reference intelligence for Atomic Thunder Bolt and Athena.')}</div>${cosmoControlsHtml(s,c)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(c.key)}" data-model-name="${esc(c.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td>${Array(6).fill('<td class="muted">Unavailable</td>').join('')}</tr>`;}const st=c.legacy==='Gemini'?(s.gemini||{}):statFor(s,c.legacy),enabled=s.settings?.[c.key]===true;const shadowTrades=c.legacy==='Gemini'?(st.total??0):(st.feederSignals??st.total??0);const open=st.open||0;const fed=c.legacy==='Gemini'?'-':(st.fedHunters??0);const pnl=c.legacy==='Gemini'?(st.pnlCents??0):st.pnlCents;return `<tr class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(c.name)}</div><div class="concept-desc">${esc(c.desc||'Reference intelligence for Atomic Thunder Bolt and Athena.')}</div>${cosmoControlsHtml(s,c)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(c.key)}" data-model-name="${esc(c.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td><td>${shadowTrades}</td><td>${open}</td><td>${pc(st.avgEntryCents)}</td><td>${pc(st.avgCurrentCents)}</td><td>${fed}</td><td class="${pnlClass(pnl)}">${money(pnl)}</td></tr>`;}).join('');}

function renderBolt(s){const b=s.atomicThunderBolt||{},e=b.episodes||{},g=b.greenTrigger||{},pg=b.patternGuardian||{},f=s.entryCandidateFunnel||{},bs=f.byStage||{},dd=f.dedup||{};setText('boltStatus',b.version||'ATOMIC-THUNDER-BOLT-V2');$('boltStatus').className='pill green';setText('boltTotal',e.total??b.detected??0);setText('boltFire',e.fire??0);setText('boltWatch',e.watch??0);setText('boltReject',e.reject??0);setText('boltExpired',e.expired??0);setText('boltClean',e.clean??0);setText('boltToxic',e.toxicLate??0);setText('boltFalse',e.falseBolt??0);renderSettingInput('atomicThunderGreenTrigger','atomicThunderGreenTriggerCents',s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1);setText('atomicThunderPatternNote',`COSMO_GREEN: executable bid must move +${Number(s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1)}c from the shadow entry. ${g.boltedShadowTrades||0} shadow trades have emitted a Bolt. One Bolt per shadow trade. Legacy ${pg.version||'ATB2'} is ${pg.authority||'RESEARCH_ONLY'} and cannot veto or delay.`);setText('entryCandidateFunnelNote',`${f.version||'ECF1'} chain: ${f.uniqueCandidates||0} candidates → ${bs.COSMO_GREEN||0} GREEN → ${bs.BOLT||0} Bolt → ${bs.ATHENA_FIRE||0} FIRE → ${bs.EXECUTION_ELIGIBLE||0} execution eligible → ${bs.OPENED||0} opened. Dedup: ${dd.athenaUnchangedSuppressed||0} unchanged Athena callbacks suppressed, ${dd.athenaChangedStateRetries||0} changed-state retries, ${dd.scarletUnchangedSuppressed||0} unchanged Needle triggers suppressed.`);const r=$('opportunityResearch');if(r)r.textContent=`Historical opportunity research remains telemetry only. Complete episodes: ${e.complete||0} · CLEAN ${e.clean||0} · TOXIC/LATE ${e.toxicLate||0} · FALSE ${e.falseBolt||0}. It has no authority over COSMO_GREEN → Bolt.`;}
function renderAthena(s){const a=s.athena||{},m=a.memory||{},d=a.lastDecision||null,b=d?.ranking?.[0]||null,target=d?.configuredTargetNetPerOriginalContractCents??s.settings?.infinityBreakMinNetPerOriginalContractCents;setText('athenaStatus',a.version||'ATHENA-A3');$('athenaStatus').className=`pill ${a.loadedAtMs?'green':'amber'}`;setText('arayashikiStatus','DIRECT');setText('athenaSurvivalCertified','OFF');setText('athenaSurvivalRejected','RANKING');setText('athenaTarget',target==null?'-':`${pc(target)} net / original contract`);setText('athenaEntries',m.entryRows||0);setText('athenaEpisodes',m.opportunityRows||0);setText('athenaProfitEpisodes',m.profitEpisodeRows||0);setText('athenaProfiles',m.profileCount||0);setText('athenaDecisions',a.decisions||0);setText('athenaFire',a.fire||0);setText('athenaWatch',a.watch||0);setText('athenaReject',a.reject||0);setText('athenaExpired',a.expired||0);setText('athenaLastEV',b?.expectedNetPerOriginalContractCents==null?'-':`${dpc(b.expectedNetPerOriginalContractCents)} / contract`);setText('athenaLastTargetProb',pct01(b?.targetHitProbability));const green=d?.fireCommand?.decisionEvidence?.greenTrigger||null;setText('athenaLast',d?`${d.decision} · ${d.selectedAttackDisplay||d.selectedAttack||'-'} · ${d.reason||'-'} · target ${pc(d.configuredTargetNetPerOriginalContractCents??target)} · ranked EV ${b?.expectedNetPerOriginalContractCents==null?'-':dpc(b.expectedNetPerOriginalContractCents)} · P(target) ${pct01(b?.targetHitProbability)} · Cosmos ${green?.cosmo||'-'} ${green?.moveCents==null?'':dpc(green.moveCents)} · Bolt ${d.boltId||'-'} · Needle armed ${a.scarletNeedle?.armed||0}`:`No Athena decision yet. · Needle armed ${a.scarletNeedle?.armed||0}`);}
function renderInfinity(s){const x=s.infinityBreak||{};setText('infinityStatus',x.version||'INFINITY-BREAK-V1');$('infinityStatus').className='pill green';for(const [id,key] of [['infinityMinNet','infinityBreakMinNetPerOriginalContractCents'],['infinityConfirmations','infinityBreakRequiredConfirmations'],['infinityBookAge','infinityBreakMaximumBookAgeMs'],['infinityWindow','infinityBreakConfirmationWindowMs']]){renderSettingInput(id,key,s.settings?.[key]??'');}setText('infinityObserved',x.positionsObserved||0);setText('infinityActive',x.activePositions||0);setText('infinityBreaks',x.breaksExecuted||0);setPnl('infinityRealized',x.realizedPnlCents);setPnl('infinityAverage',x.averageProfitCents);setText('infinityTime',duration(x.averageTimeToBreakMs));}
function renderAurora(s){const a=s.auroraExecution||{};setText('auroraStatus',a.version||'AURORA-V2');$('auroraStatus').className='pill green';renderSettingInput('auroraDamagePercent','auroraDamageControlPercent',s.settings?.auroraDamageControlPercent??a.damageControlPercent??45);renderSettingInput('auroraStopWindowMinutes','auroraStopWindowMinutes',s.settings?.auroraStopWindowMinutes??90);setText('auroraProtected',a.protectedHunters||0);setText('auroraActive',a.activeAuroraPositions||0);setText('auroraExits',a.auroraExits||0);setText('auroraAverageStop',pc(a.averageAuroraStopCents));setText('auroraAveragePct',a.averageEconomicLossRatio==null?'-':`${(Number(a.averageEconomicLossRatio)*100).toFixed(1)}%`);setPnl('auroraRealized',a.realizedAuroraPnlCents);setPnl('auroraAverageLoss',a.averageAuroraLossCents);setText('auroraRecovered',a.recoveredAfterAuroraExit||0);}
// CT-H1: history-only operator view. No trading authority, broker commands,
// settings writes, financial aggregation or SSE state payload expansion.
const CAPITAL_HISTORY_VERSION='CAPITAL-TRADE-HISTORY-V1';
const CAPITAL_HISTORY_PAGE_SIZE=100;
const CAPITAL_HISTORY_ROW_HEIGHT=44;
const CAPITAL_HISTORY_OVERSCAN=18;
function capitalHistoryEmpty(){return {rows:[],ids:new Set(),cursor:null,cutoff:null,hasMore:true,
  loading:false,controller:null,generation:0,scope:'',lastFetchedAt:0,error:'',errorAtMs:0};}
const capitalHistory={open:capitalHistoryEmpty(),closed:capitalHistoryEmpty()};
// Observed WS best bids are display-only marks, never account fills, exit
// proceeds, or financial totals. The DB-backed trade rows remain authoritative.
const capitalLiveMarks=new Map();
let capitalLastMarksAtMs=0;
function capitalCurrentMarkHtml(ticker,ledgerPrice){
  const mark=capitalLiveMarks.get(ticker),now=Date.now();
  const fresh=mark&&mark.observedAtMs<=now&&now-mark.observedAtMs<=15000
    &&capitalLastMarksAtMs<=now&&now-capitalLastMarksAtMs<=2500
    &&!operatorStreamDisconnected&&!financialSnapshotUnavailable;
  // Mark is a verified fresh best bid only, not a sale or final P/L.
  return fresh&&mark.priceCents!=null?`${pc(mark.priceCents)} <span class="muted" title="Fresh best bid — indicative, not guaranteed exit price">live bid</span>`
    :operatorStreamDisconnected?'Unverified (last mark stale)'
    :mark?'Unavailable <span class="muted">(last ledger mark not current)</span>'
    :`${pc(ledgerPrice)} <span class="muted">(ledger snapshot)</span>`;
}
function updateVisibleCapitalMarks(){
  // Patch only visible price cells: never recreate an emergency-exit button
  // while an operator is clicking it, and never rewrite the full trades table
  // on every 500ms price event.
  const body=$('openHunterBody');if(!body)return;
  for(const cell of body.querySelectorAll('td[data-live-capital-ticker]')){
    const raw=cell.dataset.ledgerMark;
    const content=capitalCurrentMarkHtml(cell.dataset.liveCapitalTicker,raw===''?null:Number(raw));
    if(cell.innerHTML!==content)cell.innerHTML=content;
  }
}
function applyCapitalMarks(payload){
  if(operatorStreamDisconnected||financialSnapshotUnavailable||modeChangePending||!STATE
    ||payload?.version!=='CAPITAL-MARKS-READONLY-R1'||payload.scopeKey!==capitalHistoryKey(STATE)
    ||!Array.isArray(payload.marks)||payload.marks.length>128)return false;
  const now=Date.now(),received=Number(payload.generatedAtMs);
  if(!Number.isSafeInteger(received)||received>now||now-received>2500
    ||received<capitalLastMarksAtMs)return false;
  const next=new Map();
  for(const m of payload.marks){
    if(!m||typeof m.ticker!=='string'||!m.ticker||next.has(m.ticker))return false;
    if(m.priceCents==null){next.set(m.ticker,{priceCents:null,observedAtMs:null});}
    else{
      const value=Number(m.priceCents),at=Number(m.observedAtMs);
      if(!Number.isFinite(value)||value<=0||value>100||!Number.isSafeInteger(at)
        ||at>received||received-at>15000)return false;
      next.set(m.ticker,{priceCents:value,observedAtMs:at});
    }
  }
  capitalLiveMarks.clear();for(const [ticker,mark] of next)capitalLiveMarks.set(ticker,mark);
  capitalLastMarksAtMs=received;
  updateVisibleCapitalMarks();
  return true;
}
let capitalHistoryScope='';
function capitalHistoryKey(s){const x=s?.settings;
  return x&&x.systemName&&x.ownerId&&['SIMULATION','LIVE'].includes(x.mode)
    &&Number.isSafeInteger(Number(x.resetTimestampMs||0))
    ?JSON.stringify([String(x.systemName),String(x.ownerId),String(x.mode),Number(x.resetTimestampMs||0),currentDashboardStartMs(x)]):'';
}
function capitalHistoryIds(kind){return kind==='open'
  ?{body:'openHunterBody',scroll:'openCapitalScroll',count:'openHunterCount',status:'openCapitalHistoryStatus',older:'openCapitalOlderBtn',refresh:'openCapitalRefreshBtn'}
  :{body:'closedBody',scroll:'closedCapitalScroll',count:'closedCount',status:'closedCapitalHistoryStatus',older:'closedCapitalOlderBtn',refresh:'closedCapitalRefreshBtn'};}
function capitalHistoryVisible(kind){return kind==='open'||!!$('closedPositionsFold')?.open;}
function capitalHistoryDate(v){return Number(v)>0&&Number.isFinite(Number(v))?new Date(Number(v)).toLocaleString():'-';}
const CAPITAL_ATTACK_LABELS={
  'Lightning Plasma':'Lightning Plasma','Great Horn Recovery':'Great Horn',
  'Crystal Wall Recovery':'Crystal Wall Recovery',
  'Sagittarius Arrow Recovery':'Sagittarius Arrow',
  'Scarlet Needle Recovery':'Scarlet Needle',
  'Pegasus Ryu Sei Ken Recovery':'Pegasus Ryu Sei Ken',
  'Crash Recovery Hunter':'Starlight Extinction'
};
function capitalAttackDisplayName(concept){return CAPITAL_ATTACK_LABELS[concept]||concept;}
function capitalHistoryOpenRow(e){
  const danger=e.aurora?.dangerPriceCents??e.aurora?.dangerLineCents;
  const control=e.aurora?`${Number(e.aurora.damageControlPercent??(Number(e.aurora.maximumEconomicLossRatio||0)*100)).toFixed(1)}% / ${pc(danger)}`:'-';
  const profit=e.entryConfig?.profitAuthority||e.entryConfig?.infinityBreak?.version||'-';
  const stop=e.auroraStopWindow?.armed===true?`${e.auroraStopWindow.windowMinutes} min${e.auroraStopWindow.remainingMinutes==null?'':` / ${e.auroraStopWindow.remainingMinutes} left`}`:'not armed';
  // Great Horn receives no new operator action or changed exit path. The
  // pre-existing Lightning emergency exit button alone is retained.
  const action=e.conceptName==='Lightning Plasma'
    ?`<button class="btn emergency-exit" data-emergency-entry="${esc(e.id)}" data-emergency-name="${esc(e.executionAttackName||e.conceptName)}">Emergency Exit</button>`:'-';
  const currentMark=capitalCurrentMarkHtml(e.ticker,e.currentPriceCents);
  return `<tr class="capital-entry-row"><td class="ticker">${esc(e.ticker)}</td><td class="capital-attack-name">${esc(capitalAttackDisplayName(e.conceptName))}</td><td>${pc(e.entryPriceCents)}</td><td data-live-capital-ticker="${esc(e.ticker)}" data-ledger-mark="${e.currentPriceCents==null?'':esc(e.currentPriceCents)}">${currentMark}</td><td>${pc(e.peakPriceCents)}</td><td>${control}</td><td>${esc(stop)}</td><td>${esc(profit)}</td><td>${e.positionExposureConfirmed===false?'Unconfirmed':esc(e.remainingCount??e.count??0)}</td><td>${esc(e.status)}</td><td class="${pnlClass(e.positionPnlCents)}">${e.positionExposureConfirmed===false?'Pending fill':financialMoney(e.positionPnlCents)}</td><td>${action}</td></tr>`;
}
function capitalHistoryClosedRow(e){
  const p=e.postExitState||{};
  const post=e.postExitCurrentPriceCents??p.latestMarketPriceCents??(e.conceptName==='Lightning Plasma'?e.currentPriceCents:null);
  const delta=e.postExitDeltaFromExitCents??p.deltaFromExitCents;
  const best=e.postExitBestPriceCents??p.bestExecutableBidCents;
  const bestDelta=e.postExitBestDeltaCents??p.bestDeltaFromExitCents;
  const missed=e.postExitMissedUpsideCents??p.missedUpsideNetCents;
  const worst=e.postExitWorstPriceCents??p.worstExecutableBidCents;
  const worstDelta=e.postExitWorstDeltaCents??p.worstDeltaFromExitCents;
  const saved=e.postExitLossAvoidedCents??p.lossAvoidedNetCents;
  return `<tr class="capital-entry-row"><td class="ticker">${esc(e.ticker)}</td><td class="capital-attack-name">${esc(capitalAttackDisplayName(e.conceptName))}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${pc(post)}</td><td class="${pnlClass(delta)}">${dpc(delta)}</td><td>${best==null?'-':`${pc(best)} (${dpc(bestDelta)})`}</td><td class="${pnlClass(missed)}">${missed==null?'-':money(missed)}</td><td>${worst==null?'-':`${pc(worst)} (${dpc(worstDelta)})`}</td><td class="${pnlClass(saved)}">${saved==null?'-':money(saved)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td><td>${capitalHistoryDate(e.openedAtMs)}</td><td>${capitalHistoryDate(e.closedAtMs)}</td></tr>`;
}
function renderCapitalViewport(kind){
  if(!capitalHistoryVisible(kind))return;
  const h=capitalHistory[kind],ids=capitalHistoryIds(kind),pane=$(ids.scroll),body=$(ids.body);
  if(!pane||!body)return;
  const total=h.rows.length;
  if(!total){body.innerHTML=`<tr><td colspan="${kind==='open'?12:14}" class="muted">${h.loading?'Loading capital trades...':h.error?'Trade history unavailable.':'No current-scope capital trades.'}</td></tr>`;return;}
  const start=Math.max(0,Math.floor(pane.scrollTop/CAPITAL_HISTORY_ROW_HEIGHT)-CAPITAL_HISTORY_OVERSCAN);
  const windowSize=Math.ceil((pane.clientHeight||510)/CAPITAL_HISTORY_ROW_HEIGHT)+2*CAPITAL_HISTORY_OVERSCAN;
  const end=Math.min(total,start+windowSize),colspan=kind==='open'?12:14;
  const spacer=(count)=>count>0?`<tr class="capital-spacer-row" aria-hidden="true"><td colspan="${colspan}" style="height:${count*CAPITAL_HISTORY_ROW_HEIGHT}px"></td></tr>`:'';
  body.innerHTML=spacer(start)+h.rows.slice(start,end).map(kind==='open'?capitalHistoryOpenRow:capitalHistoryClosedRow).join('')+spacer(total-end);
}
function renderCapitalHistoryStatus(kind,s){
  const h=capitalHistory[kind],ids=capitalHistoryIds(kind),combined=capitalCombinedPerformance(s);
  const verified=combined.available===true;
  const n=kind==='closed'&&verified&&numericReportValue(combined[kind])?Number(combined[kind]):null;
  setText(ids.count,kind==='open'?`(${h.rows.length.toLocaleString()} loaded${h.hasMore?' +':''})`:n===null?'(total unavailable)':`(${n.toLocaleString()} total)`);
  if(kind==='open')setText('hunterSummary',verified
    ?`${combined.open} current-session open positions. This risk table also includes earlier-session open exposure across all seven capital attacks; history is not erased.`
    :'All seven capital attacks: financial total unavailable until matching reports verify; trade history remains separate and scope-checked.');
  const count=h.rows.length,summary=`${count.toLocaleString()} loaded${n===null?'':` of ${n.toLocaleString()}`}`;
  const freshnessWarning=financialSnapshotUnavailable
    ?'Stale — current state snapshot unavailable. ':operatorStreamDisconnected
    ?'Update stream disconnected. Last received values are not live. ':'';
  setText(ids.status,freshnessWarning+(!capitalHistoryVisible(kind)&&!h.lastFetchedAt
    ?'Expand to load current-scope trade history.'
    :h.error?`${summary}. ${h.error} No fresh trade-list snapshot is asserted.`
    :h.loading?`${summary}. Loading ${count?'older':'current'} records...`
    :`${summary}${h.hasMore?' · Scroll down for older records.':' · End of available history.'}${h.lastFetchedAt?' · Last fetched '+new Date(h.lastFetchedAt).toLocaleTimeString():''}`));
  if($(ids.older))$(ids.older).disabled=h.loading||!h.hasMore||!h.scope||!capitalHistoryVisible(kind);
  if($(ids.refresh))$(ids.refresh).disabled=h.loading||!h.scope||!capitalHistoryVisible(kind);
}
function clearCapitalHistory(kind,scope){
  if(kind==='open'){capitalLiveMarks.clear();capitalLastMarksAtMs=0;}
  const h=capitalHistory[kind];h.controller?.abort();
  const fresh=capitalHistoryEmpty();fresh.generation=h.generation+1;fresh.scope=scope;
  capitalHistory[kind]=fresh;
  const pane=$(capitalHistoryIds(kind).scroll);if(pane)pane.scrollTop=0;
  renderCapitalViewport(kind);
}
function capitalizePageScopeMatches(page,s,kind){
  if(page?.version!==CAPITAL_HISTORY_VERSION||page.status!==kind
    ||!financialScopeMatches(page.scope,s?.settings)||!Array.isArray(page.rows)
    ||page.rows.length>CAPITAL_HISTORY_PAGE_SIZE||typeof page.hasMore!=='boolean'
    ||!Number.isSafeInteger(Number(page.snapshotCutoffMs))||Number(page.snapshotCutoffMs)<0
    ||(page.hasMore&&(page.rows.length===0||!page.nextCursor
       ||!Number.isSafeInteger(Number(page.nextCursor.beforeAtMs))
       ||typeof page.nextCursor.beforeId!=='string'||!page.nextCursor.beforeId)))return false;
  return page.rows.every(e=>{
    const starlight=e?.conceptName==='Crash Recovery Hunter';
    const allowed=['Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery','Sagittarius Arrow Recovery','Scarlet Needle Recovery','Pegasus Ryu Sei Ken Recovery','Crash Recovery Hunter'];
    if(!e||!e.id||!allowed.includes(e.conceptName)
      ||!(kind==='open'?dashboardRowIdentityMatches(e,s.settings):dashboardRowScopeMatches(e,s.settings)))return false;
    if(!starlight&&(e.executionClass==='SHADOW_SAINT'||e.entryConfig?.executionClass==='SHADOW_SAINT'))return false;
    if(kind==='closed')return e.status==='closed'&&Number(e.count)>0;
    return ['open','exit_pending','entry_pending','pending_recovery'].includes(e.status)
      &&Number(e.remainingCount)>0&&(starlight||e.positionExposureConfirmed===true);
  });
}
async function loadCapitalHistoryPage(kind,{refresh=false}={}){
  if(!STATE||!capitalHistoryVisible(kind)||!capitalHistoryScope||modeChangePending)return;
  if(refresh)clearCapitalHistory(kind,capitalHistoryScope);
  const h=capitalHistory[kind];if(h.loading||!h.hasMore||h.scope!==capitalHistoryScope)return;
  const scope=h.scope,generation=h.generation,controller=new AbortController();
  h.loading=true;h.controller=controller;h.error='';renderCapitalHistoryStatus(kind,STATE);
  try{
    const params=new URLSearchParams({status:kind,limit:String(CAPITAL_HISTORY_PAGE_SIZE)});
    if(h.cursor){params.set('beforeAtMs',String(h.cursor.beforeAtMs));params.set('beforeId',String(h.cursor.beforeId));}
    if(h.cutoff!==null)params.set('snapshotCutoffMs',String(h.cutoff));
    const response=await operatorFetch(`/api/capital-trades?${params}`,{cache:'no-store',signal:controller.signal});
    if(!response.ok){let detail;try{detail=(await response.json()).error;}catch{}throw new Error(detail||`HTTP ${response.status}`);}
    const page=await response.json();
    if(h!==capitalHistory[kind]||generation!==h.generation||scope!==capitalHistoryScope||!STATE||capitalHistoryKey(STATE)!==scope)return;
    if(!capitalizePageScopeMatches(page,STATE,kind))throw new Error('Scope, version, status or row validation failed; response rejected');
    if(h.cutoff!==null&&Number(page.snapshotCutoffMs)!==h.cutoff)throw new Error('History cutoff changed during pagination');
    if(h.cursor&&page.nextCursor&&(
      Number(page.nextCursor.beforeAtMs)>Number(h.cursor.beforeAtMs)||
      (Number(page.nextCursor.beforeAtMs)===Number(h.cursor.beforeAtMs)
        &&page.nextCursor.beforeId>=h.cursor.beforeId)))
      throw new Error('History cursor did not advance');
    h.cutoff=Number(page.snapshotCutoffMs);
    for(const e of page.rows){if(h.ids.has(String(e.id)))continue;h.ids.add(String(e.id));h.rows.push(e);}
    h.cursor=page.nextCursor;h.hasMore=page.hasMore;h.lastFetchedAt=Date.now();h.errorAtMs=0;
    if(h.hasMore&&!h.cursor)throw new Error('History cursor missing while more pages are advertised');
    renderCapitalViewport(kind);
  }catch(error){
    if(h!==capitalHistory[kind]||generation!==h.generation||scope!==capitalHistoryScope||error.name==='AbortError')return;
    h.error=String(error?.message||error);h.errorAtMs=Date.now();console.error('Capital trade history:',h.error);
  }finally{
    if(h===capitalHistory[kind]&&generation===h.generation){h.loading=false;h.controller=null;if(STATE)renderCapitalHistoryStatus(kind,STATE);renderCapitalViewport(kind);}
  }
}
function syncCapitalHistory(s){
  const scope=capitalHistoryKey(s);
  if(scope!==capitalHistoryScope){capitalHistoryScope=scope;
    for(const kind of ['open','closed'])clearCapitalHistory(kind,scope);
  }
  const combined=capitalCombinedPerformance(s);
  for(const kind of ['open','closed']){
    const h=capitalHistory[kind],pane=$(capitalHistoryIds(kind).scroll);
    if(combined.available===true){
      const signature=JSON.stringify([combined.open,combined.closed,combined.pending,combined.realizedCents]);
      const changed=h.financialSignature!=null&&h.financialSignature!==signature;
      h.financialSignature=signature;
      if(changed)h.refreshRequired=true;
      if(h.refreshRequired&&!h.loading&&h.lastFetchedAt>0&&pane&&pane.scrollTop<60
        &&capitalHistoryVisible(kind)){
        h.refreshRequired=false;void loadCapitalHistoryPage(kind,{refresh:true});
      }
    }
    renderCapitalHistoryStatus(kind,s);
    if(scope&&capitalHistoryVisible(kind)&&!capitalHistory[kind].loading&&capitalHistory[kind].lastFetchedAt===0&&!capitalHistory[kind].error)
      void loadCapitalHistoryPage(kind);
  }
}
function capitalHistoryAutoRefresh(){
  if(!STATE||modeChangePending||financialSnapshotUnavailable)return;
  for(const kind of ['open','closed']){
    const h=capitalHistory[kind],pane=$(capitalHistoryIds(kind).scroll);
    if(!capitalHistoryVisible(kind)||!pane||!h.scope||h.loading)continue;
    // A temporary API/DB failure must not permanently strand the seven-stage
    // history. Retry only after a bounded delay; keep the existing cursor and
    // scroll when the operator is inspecting older positions.
    if(h.error){
      if(Date.now()-h.errorAtMs>=30000)
        void loadCapitalHistoryPage(kind,{refresh:h.lastFetchedAt>0&&pane.scrollTop<60});
      continue;
    }
    // Reconcile the authoritative OPEN trade list frequently enough to detect
    // resumed/recovered positions. Closed history retains its slow cadence.
    const minimumAgeMs=kind==='open'?8000:30000;
    if(!h.lastFetchedAt||Date.now()-h.lastFetchedAt<minimumAgeMs)continue;
    // Never disrupt an operator reviewing older historical trades.
    if(pane.scrollTop<60)void loadCapitalHistoryPage(kind,{refresh:true});
  }
}
function expireCapitalMarksIfStale(){
  // A silent SSE/proxy stall need not fire onerror. Expire a displayed 'live
  // bid' locally without requesting another broker quote or a DB snapshot.
  if(capitalLastMarksAtMs>0&&Date.now()-capitalLastMarksAtMs>2500){
    capitalLiveMarks.clear();capitalLastMarksAtMs=0;
    updateVisibleCapitalMarks();
  }
}
function bindCapitalHistory(){
  for(const kind of ['open','closed']){
    const ids=capitalHistoryIds(kind),pane=$(ids.scroll);
    if(!pane)continue;
    let frame=0;
    pane.addEventListener('scroll',()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{frame=0;renderCapitalViewport(kind);
        const h=capitalHistory[kind];if(h.hasMore&&!h.loading&&pane.scrollTop+pane.clientHeight>=pane.scrollHeight-200)
          void loadCapitalHistoryPage(kind);
      });
    },{passive:true});
    $(ids.older)?.addEventListener('click',()=>void loadCapitalHistoryPage(kind));
    $(ids.refresh)?.addEventListener('click',()=>void loadCapitalHistoryPage(kind,{refresh:true}));
  }
  $('closedPositionsFold')?.addEventListener('toggle',()=>{if(STATE)syncCapitalHistory(STATE);});
  setInterval(()=>{capitalHistoryAutoRefresh();expireCapitalMarksIfStale();},2000);
}
bindCapitalHistory();

function renderTrades(s){
  renderShadowDashboard(s);const allFeed=s.cosmoShadowTrades||s.openFeeders||[],feed=COSMO_FILTER==='ALL'?allFeed:allFeed.filter(e=>e.conceptName===COSMO_FILTER),gemini=s.geminiTrades||[];
  syncCapitalHistory(s);
  setText('openFeederCount',`(${allFeed.length})`);
  if($('openCosmoSignalsFold')?.open)$('openFeederBody').innerHTML=feed.map(e=>{
    const q=e.currentPriceCents;
    const ask=e.dataState==='LIVE'?(e.currentAskCents??e.liveAskCents??e.quote?.yesAsk):null;
    const move=e.shadowMoveCents??(Number(q)-Number(e.entryPriceCents));
    const state=e.shadowState||((e.atomicThunderBoltId)?'BOLT_SENT':move>=Number(e.greenTriggerCents||s.settings?.atomicThunderGreenTriggerCents||1)?'GREEN':'TRACKING');
    const stateClass=state==='BOLT_SENT'||state==='GREEN'?'green':'amber';
    return `<tr><td>${esc(e.conceptName)}</td><td><div>${esc(e.marketTitle||e.title||'')}</div><div class="ticker">${esc(e.ticker)}</div></td><td>${pc(e.entryPriceCents)}</td><td>${pc(q)}</td><td>${pc(ask)}</td><td class="${pnlClass(move)}">${dpc(move)}</td><td class="${pnlClass(e.shadowPnlCents)}">${money(e.shadowPnlCents)}</td><td>${pc(e.peakPriceCents)}</td><td><span class="pill ${stateClass}">${esc(state)}</span></td><td>+${pc(e.greenTriggerCents??s.settings?.atomicThunderGreenTriggerCents??1)}</td><td>${e.atomicThunderBoltId?`⚡ ${esc(e.atomicThunderBoltId.slice(0,12))}`:'-'}</td><td>${esc(e.athenaSelectedAttack||'-')}</td><td>${e.realEntryId?esc(e.realEntryId.slice(0,12)):'-'}</td><td>${e.openedAtMs?new Date(e.openedAtMs).toLocaleTimeString():'-'}</td></tr>`;
  }).join('')||'<tr><td colspan="14" class="muted">No Cosmos shadow trades for this filter.</td></tr>';
  setText('geminiTradeCount',`(${gemini.length})`);
  const gb=$('geminiTradeBody');
  if(gb)gb.innerHTML=gemini.map(e=>{
    const x=e.virtualExecution||{};
    const state=e.status==='closed'?(Number(e.pnlCents)>0?'WIN':Number(e.pnlCents)<0?'LOSS':'SCRATCH'):'OPEN';
    const stateClass=state==='WIN'?'green':state==='LOSS'?'red':'amber';
    const execText=x.fullPositionExecutable===true?`${pc(x.executableAverageBidCents)} / ${x.executableCount??e.count}/${x.requiredCount??e.count}`:x.executableCount?`${pc(x.executableAverageBidCents)} / ${x.executableCount}/${x.requiredCount??e.count}`:'-';
    const confirmText=e.status==='closed'?'-':`${x.confirmations??0}/${x.requiredConfirmations??e.entryConfig?.virtualInfinity?.requiredFreshConfirmations??2}`;
    const profitText=e.status==='closed'?esc(e.closeReason||'-'):`+${pc(x.targetNetPerOriginalContractCents??1)} net · ${confirmText} · ${esc(x.holdReason||x.action||'observing')}`;
    const danger=e.aurora?.dangerPriceCents??e.stopPriceCents;
    const p=e.status==='closed'?e.pnlCents:e.shadowPnlCents;
    return `<tr><td><div>${esc(e.marketTitle||'')}</div><div class="ticker">${esc(e.ticker)}</div></td><td>Another Dimension</td><td>${esc(e.sourceFeeder||'-')}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentPriceCents)}</td><td title="Full-position executable virtual exit VWAP / executable qty">${execText}</td><td>${pc(e.peakPriceCents)}</td><td>${pc(e.lowestPriceAfterEntryCents)} / ${dpc(-(Number(e.maeCents||0)))}</td><td>${e.aurora?`${Number(e.aurora.damageControlPercent??0).toFixed(1)}% / ${pc(danger)}`:'-'}</td><td>${profitText}</td><td>${e.remainingCount??e.count??0}</td><td><span class="pill ${stateClass}">${state}</span></td><td class="${pnlClass(p)}">${money(p)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.closeReason||x.holdReason||'-')}</td><td>${e.openedAtMs?new Date(e.openedAtMs).toLocaleString():'-'}</td><td>${e.closedAtMs?new Date(e.closedAtMs).toLocaleString():'-'}</td></tr>`;
  }).join('')||'<tr><td colspan="18" class="muted">No Gemini / Another Dimension trades yet.</td></tr>';
  if($('trackedMarketsFold')?.open)$('trackedBody').innerHTML=(s.trackedMarkets||[]).map(t=>`<tr><td class="ticker">${esc(t.ticker)}</td><td>${esc(t.market_title||t.marketTitle||'')}</td><td>${pc(t.yes_bid_cents??t.yesBid)}</td><td>${pc(t.yes_ask_cents??t.yesAsk)}</td><td>${t.scan_count??t.scanCount??0}</td><td>${t.last_scan_ms?new Date(Number(t.last_scan_ms)).toLocaleTimeString():'-'}</td></tr>`).join('');
  for(const btn of document.querySelectorAll('[data-cosmo-filter]'))btn.classList.toggle('active',btn.dataset.cosmoFilter===COSMO_FILTER);
}


// All seven real-capital attack rows share the same authenticated snapshot.
// This table and the combined KPIs NEVER accept shadow Starlight as capital.
const CAPITAL_ATTACK_REPORT_ROWS=[
  ['Starlight Extinction','Crash Recovery Hunter','SC1','starlightCapitalPerformance'],
  ['Lightning Plasma','Lightning Plasma','LP1','performance'],
  ['Great Horn','Great Horn Recovery','GH1','greatHornPerformance'],
  ['Crystal Wall Recovery','Crystal Wall Recovery','CW1','crystalWallRecoveryPerformance'],
  ['Sagittarius Arrow','Sagittarius Arrow Recovery','SA1','sagittariusArrowPerformance'],
  ['Scarlet Needle','Scarlet Needle Recovery','SN2','scarletNeedleCapitalPerformance'],
  ['Pegasus Ryu Sei Ken','Pegasus Ryu Sei Ken Recovery','PR3','pegasusRyuSeiKenCapitalPerformance']
];
function capitalAttackTableReport(s,concept,code,key){
  // The UI can receive mixed-version or late snapshots during restarts and
  // reconnects. Never display an older capital row as if it belonged to the
  // current seven-attack financial snapshot.
  const lightning=lightningPerformance(s);
  const expectedAt=lightning.available&&Number.isSafeInteger(Number(lightning.asOfMs))
    &&Number(lightning.asOfMs)>0?Number(lightning.asOfMs):null;
  if(expectedAt===null)return {available:false,reason:'Missing verified Lightning snapshot timestamp'};
  let report;
  if(key==='performance')report=lightning;
  else if(key==='greatHornPerformance')report=verifiedGreatHornPerformance(s);
  else if(key==='crystalWallRecoveryPerformance')report=verifiedCrystalWallRecoveryPerformance(s);
  else {
    const r=s?.[key];
    const valid=r?.reportingVersion===code+'-CAPITAL-REPORT-V1'
      &&r.scope?.conceptName===concept&&r.scope?.executionClass==='CAPITAL'
      &&financialScopeMatches(r.scope,s?.settings)
      &&capitalCounts.every(k=>numericReportValue(r[k])&&Number(r[k])>=0)
      &&numericReportValue(r.realizedCents)
      &&(r.valuationComplete===false||numericReportValue(r.unrealizedCents));
    report=valid?{...r,available:true}:{available:false,reason:'Unverified capital report or scope'};
  }
  if(report.available!==true)return report;
  // Shared financial contract: even a correctly scoped Lightning report can be
  // partial or malformed during a restart. Never sum invalid P/L or counts.
  const counts=[...capitalCounts,'total','unreconciled'];
  if(!counts.every(k=>Number.isSafeInteger(Number(report[k]))&&Number(report[k])>=0)
    ||!numericReportValue(report.realizedCents)
    ||!numericReportValue(report.avgEntryCents)
    ||Number(report.closed)!==Number(report.wins)+Number(report.losses)+Number(report.scratches)
    ||Number(report.total)!==Number(report.open)+Number(report.closed)
    ||typeof report.financialComplete!=='boolean'
    ||typeof report.valuationComplete!=='boolean'
    ||(report.valuationComplete&&!numericReportValue(report.unrealizedCents))
    ||!capitalPeriods.every(period=>report.periodsComplete?.[period]===true
      ?numericReportValue(report[period+'RealizedCents'])
      :report.periodsComplete?.[period]===false))
    return {available:false,reason:'Capital report has invalid counts, economics or period-completeness metadata'};
  return Number.isSafeInteger(Number(report.asOfMs))&&Number(report.asOfMs)===expectedAt
    ?report:{available:false,reason:'Capital report timestamp does not match the current snapshot'};
}
function renderCapitalAttackResults(s){
  const body=$('capitalAttackResultsBody');if(!body)return;
  const records=CAPITAL_ATTACK_REPORT_ROWS.map(([name,concept,code,key])=>({
    name,report:capitalAttackTableReport(s,concept,code,key)}));
  body.innerHTML=records.map(({name,report:r})=>{
    if(r.available!==true)return `<tr><th scope="row" class="capital-attack-name">${esc(name)}</th><td colspan="10" class="muted">Unavailable — ${esc(r.reason||'missing matching capital report')}</td></tr>`;
    // A time-window total is verified only when its completeness flag is
    // explicitly true. Missing metadata cannot silently mean zero or complete.
    const realized=(key,period)=>r.periodsComplete?.[period]===true?r[key]:null;
    const moneyCell=(value)=>`<td class="${value===null||value===undefined||!Number.isFinite(Number(value))?'muted':pnlClass(value)}">${financialMoney(value)}</td>`;
    return `<tr><th scope="row" class="capital-attack-name">${esc(name)}</th>`+
      `<td>${esc(r.open)}</td><td>${esc(r.closed)}</td><td>${esc(r.wins)} / ${esc(r.losses)}</td>`+
      `<td>${Number(r.closed)>0?pct01(Number(r.wins)/Number(r.closed)):'-'}</td><td>${esc(r.pending)}</td>`+
      moneyCell(r.realizedCents)+moneyCell(r.valuationComplete===false?null:r.unrealizedCents)+
      moneyCell(realized('dayRealizedCents','day'))+
      moneyCell(realized('weekRealizedCents','week'))+
      moneyCell(realized('monthRealizedCents','month'))+'</tr>';
  }).join('');
  const valid=records.filter(({report})=>report.available===true).length;
  const combined=capitalCombinedPerformance(s);
  setText('capitalAttackResultsStatus',valid===CAPITAL_ATTACK_REPORT_ROWS.length&&combined.available===true
    ?(combined.financialComplete===false?`${combined.unreconciled} funded position(s) await broker reconciliation. Recorded results remain incomplete until those positions reconcile. `:'')+'All seven scoped capital reports use the same snapshot. Profit periods show recorded realized net P/L; unrealized marks do not guarantee liquidation proceeds.'
    :`${valid} of ${CAPITAL_ATTACK_REPORT_ROWS.length} independently scoped capital reports available. ${combined.available===true?'':'Combined totals require matching snapshots; unavailable values are not replaced with zeros.'}`);
}

// Authorization and transport health are independent. A healthy feed must not
// conceal that this installation cannot submit new LIVE orders.
function renderLiveAuthorization(s){
  const mode=s?.settings?.mode,armed=s?.settings?.liveArmed===true;
  const disarmed=mode==='LIVE'&&!armed;
  // Never present a historical ARMED (or DISARMED) snapshot as current when
  // the operator event stream is disconnected. This affects display only;
  // actual LIVE authorization remains exclusively server-controlled.
  const unverified=typeof liveAuthorizationUnverified==='boolean'&&liveAuthorizationUnverified;
  const pill=$('liveArmPill');if(pill){
    pill.textContent=unverified?(mode==='LIVE'?'LIVE STATUS UNVERIFIED':'MODE STATUS UNVERIFIED')
      :mode==='LIVE'?(armed?'LIVE ARMED':'LIVE DISARMED'):'SIMULATION';
    pill.className=`pill ${unverified?'amber':disarmed?'red':armed?'green':'amber'}`;
  }
  const unsure=$('liveArmUnverifiedBanner');if(unsure)unsure.classList.toggle('hidden',!unverified);
  // Keep the existing manually authorized rearm path available even when the
  // update stream is down. Mark its former disarmed state as LAST KNOWN only;
  // the server still decides whether a real authorization request is valid.
  const banner=$('liveDisarmedBanner');if(banner)banner.classList.toggle('hidden',!disarmed);
  setText('liveDisarmedHeading',unverified&&disarmed
    ?'LAST KNOWN: LIVE DISARMED — CURRENT STATUS UNVERIFIED.'
    :'LIVE DISARMED — NEW REAL ORDERS BLOCKED.');
  if(unverified){
    setText('modeNote','Dashboard update stream disconnected — LIVE authorization status unverified. Last received mode is not a current authorization guarantee.');
    if(disarmed)setText('liveDisarmedReason','Last known state was LIVE disarmed. The current state is unverified because dashboard updates disconnected; reauthorization still requires the original confirmation and server safety checks.');
  }else if(disarmed){
    const boot=s?.health?.controlStateDiagnostics?.startupDisarm;
    const auth=s?.health?.controlStateDiagnostics?.liveOrderAuthorization;
    const resumeScheduled=boot?.authorizationRequired===false
      ||auth?.reason==='live_resume_scheduled_waiting_for_health'
      ||boot?.reason==='prior_authorized_live_resume_scheduled';
    const explanation=resumeScheduled
      ?'LIVE authorization is already stored. Resume is scheduled and waiting for a clean broker reconciliation. No new Enable LIVE click is required.'
      :boot?.priorPersistedArmed===true
      ?'Stored LIVE authorization was cleared at startup. A new explicit authorization is required; the cause of the restart is not established.'
      :'LIVE is selected without authorization. This process started disarmed or authorization was subsequently cleared. New BUY orders remain blocked.';
    setText('liveDisarmedHeading',resumeScheduled?'LIVE RESUME SCHEDULED — WAITING FOR BROKER HEALTH.':'LIVE DISARMED — NEW REAL ORDERS BLOCKED.');
    setText('liveDisarmedReason',explanation);
    const rearmWait=$('liveRearmBtn');if(rearmWait){rearmWait.classList.toggle('hidden',resumeScheduled);rearmWait.hidden=resumeScheduled;}
  }
  const rearm=$('liveRearmBtn');if(rearm)rearm.disabled=modeChangePending||!disarmed||rearm.hidden===true;
}
function renderSystem(s){if($('modeBtn')){$('modeBtn').disabled=true;$('modeBtn').title='Q-17 is permanently simulation-only; no real orders';}const p=lightningPerformance(s),account=actualAccountBalances(s),h=s.health||{},r=s.resourceUsage||{};const live=s.settings?.mode==='LIVE'&&s.settings?.liveArmed===true,disarmedLive=s.settings?.mode==='LIVE'&&!live;setText('portfolioLabel',disarmedLive?'LIVE selected, not armed':live?'Kalshi Account Portfolio':'SIM Account Value');setText('cashLabel',disarmedLive?'LIVE disarmed — cash unavailable':live?'Kalshi Account Cash':'SIM Account Free Cash');if(disarmedLive){setText('portfolioValue','Unavailable');setText('simFreeCash','Unavailable');}else if(live){if(account.kalshiPortfolioCents==null)setText('portfolioValue','Unavailable');else setFinancialPnl('portfolioValue',account.kalshiPortfolioCents,true);if(account.kalshiCashCents==null)setText('simFreeCash','Unavailable');else setFinancialPnl('simFreeCash',account.kalshiCashCents,true);}else{setFinancialPnl('portfolioValue',account.portfolioValueCents,true);setFinancialPnl('simFreeCash',account.simulationCashCents,true);}const gaps=s.brokerLedgerGaps||{};const untracked=gaps.untracked||[];setText('brokerBookNote',s.settings?.mode==='LIVE'?`Kalshi contracts ${gaps.brokerContracts||0} · ledger ${gaps.ledgerContracts||0} · ignored other system ${untracked.length}${untracked.length?': '+untracked.map(x=>`${x.ticker} +${x.ignored??x.untracked}`).join(', '):''}`:'');renderCapitalAttackResults(s);renderCapitalCombined(s);setText('modeBtn',s.settings?.mode||'SIMULATION');$('modeBtn').className=`btn ${s.settings?.mode==='LIVE'?'danger':'light'}`;setText('modeNote',windowModeArmDenial?windowModeArmDenial:(s.settings?.mode==='LIVE'?(s.settings?.liveArmed?'LIVE armed':'LIVE selected, disarmed — entries blocked'):'Paper trading - no real orders.')+(currentDashboardStartMs(s.settings)>0?' · Dashboard session since '+new Date(currentDashboardStartMs(s.settings)).toLocaleString()+' (history retained)':''));setText('modeBtn','Q-17 · SIM ONLY');setText('engineBtn',s.settings?.engineActive?'Stop Engine':'Start Engine');setText('engineStatus',s.settings?.engineActive?'Engine running':'Engine stopped');if($('resetSimulationBtn'))$('resetSimulationBtn').disabled=s.settings?.mode!=='SIMULATION';$('engineStatus').className=`pill ${s.settings?.engineActive?'green':'red'}`;setText('systemStatus',h.degraded?'DEGRADED':'HEALTHY');$('systemStatus').className=`pill ${h.degraded?'red':'green'}`;setText('uptime',duration(Date.now()-Number(h.startedAtMs||Date.now())));/* Historical errors remain in the diagnostics/export backend; only the current HEALTHY/DEGRADED status is shown on the dashboard. */const scan=s.scanner||{};const scanFresh=Number(scan.lastScanMs||0)>0&&Date.now()-Number(scan.lastScanMs)<10*60*1000;setText('entryRunning',scanFresh?'Running':'Waiting');$('entryRunning').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerActive',scanFresh?'ACTIVE':'WAITING');$('scannerActive').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerDetail',`Tracked ${scan.tracked||0} · active markets ${scan.activeMarkets||0} · last scan ${scan.lastScanMs?duration(Date.now()-scan.lastScanMs)+' ago':'never'}`);const resourceState=r.pressureState||r.status||'UNKNOWN';setText('resourceStatus',resourceState);$('resourceStatus').className=`pill ${['NORMAL','GREEN'].includes(resourceState)?'green':['WATCH','COMPACT','PRESSURE'].includes(resourceState)?'amber':'red'}`;setText('resourceRss',mib(r.memory?.rssBytes??r.rssBytes));setText('resourceHeapUsed',mib(r.memory?.heapUsedBytes??r.heapUsedBytes));setText('resourceCpu',Number.isFinite(Number(r.cpuPercent))?`${Number(r.cpuPercent).toFixed(1)}%`:'-');setText('resourceUptime',duration((r.uptimeSeconds??r.processUptimeSeconds??0)*1000));setText('connectionPill',h.restOk&&h.websocketFresh?'Connected':'Connection check');$('connectionPill').className=`pill ${h.restOk&&h.websocketFresh?'green':'amber'}`;renderSettingInput('systemNameInput','systemName',s.settings?.systemName||'SAGITTARIUS');const andOn=s.settings?.andromedaThunderWaveEnabled===true;const andLevel=String(s.settings?.andromedaThunderWaveLevel||'HIGH').toUpperCase();if($('andromedaStatus')){$('andromedaStatus').textContent=andOn?`ON ${andLevel}`:'OFF';$('andromedaStatus').className=`pill ${andOn?'amber':'red'}`;}if($('andromedaThunderWaveToggle')){$('andromedaThunderWaveToggle').textContent=andOn?'ON':'OFF';$('andromedaThunderWaveToggle').className=`galactic-toggle ${andOn?'on':''}`;}if($('andromedaThunderWaveLevel')&&document.activeElement!==$('andromedaThunderWaveLevel'))$('andromedaThunderWaveLevel').value=['HIGH','MID','LOW','OPEN'].includes(andLevel)?andLevel:'HIGH';}
function renderFreezingCoffin(s){const on=s.settings?.freezingCoffinEnabled===true;setText('freezingCoffinStatus',on?'ON':'OFF');$('freezingCoffinStatus').className=`pill ${on?'amber':'red'}`;const b=$('freezingCoffinToggle');if(b){b.textContent=on?'ON':'OFF';b.dataset.enabled=String(on);b.className=`galactic-toggle ${on?'enabled':'disabled'}`;}renderSettingInput('freezingCoffinDrop','freezingCoffinMaxDropCents',s.settings?.freezingCoffinMaxDropCents??3);}
function renderGalactic(s){const on=s.settings?.galacticExplosionEnabled===true;setText('galacticStatus',on?'ON':'OFF');$('galacticStatus').className=`pill ${on?'amber':'red'}`;const b=$('galacticExplosionToggle');b.textContent=on?'ON':'OFF';b.dataset.enabled=String(on);b.className=`galactic-toggle ${on?'enabled':'disabled'}`;}
function controlFingerprint(s){try{return JSON.stringify({settings:s.settings||{},conceptStats:s.conceptStats||[],gemini:s.gemini||{}});}catch{return String(Date.now());}}
// Keep the editable control DOM stable while typing; financial boards still refresh.
// The fingerprint stays pending, so the next unfocused render applies fresh controls.
function attackControlsFingerprint(s){try{return JSON.stringify(s.settings||{});}catch{return String(Date.now());}}
function render(s){
  // R4: an accepted state is NOT a fully loaded dashboard until every required
  // panel has rendered. R3 committed STATE before rendering and suppressed its
  // own retry when a later panel threw. Preserve the last fully rendered state
  // and fail closed on any partial or malformed financial/user-interface view.
  const previous=STATE;
  try{
    if(!s||typeof s!=='object'||!s.settings||!s.health
      ||!['LIVE','SIMULATION'].includes(s.settings.mode)
      ||typeof s.settings.liveArmed!=='boolean')
      throw new Error('operator_state_invalid_structure');
    STATE=s;
    financialSnapshotUnavailable=false;operatorStreamDisconnected=false;
    renderSystem(s);renderLiveAuthorization(s);renderBolt(s);renderAthena(s);renderInfinity(s);renderAurora(s);renderTrades(s);
    const editing=!!document.activeElement?.matches('[data-setting-key]');
    const attackFp=attackControlsFingerprint(s);
    if(!editing&&(attackFp!==ATTACK_CONTROL_FINGERPRINT||!$('attackBody')?.firstElementChild)){
      renderAttacks(s);ATTACK_CONTROL_FINGERPRINT=attackFp;
    }
    renderAttackMetrics(s);
    const fp=controlFingerprint(s);
    if(fp!==CONTROL_FINGERPRINT&&!editing){
      CONTROL_FINGERPRINT=fp;renderSettings(s);renderCosmos(s);renderGalactic(s);renderFreezingCoffin(s);
    }
    syncOperatorUpdates(s);
    // Only a completed render permits operator controls to reflect this snapshot.
    if(bootRetryTimer!==null){clearTimeout(bootRetryTimer);bootRetryTimer=null;}
    if(!modeChangePending&&!liveAuthorizationUnverified)for(const id of ['engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=false;
    return true;
  }catch(error){
    STATE=previous;
    ATTACK_CONTROL_FINGERPRINT=null;CONTROL_FINGERPRINT=null;
    // A partially painted financial section must never masquerade as current.
    const reason='Dashboard rendering failed; retrying the verified state read.';
    markFinancialSnapshotUnavailable(reason);
    setText('systemStatus','DISPLAY UNVERIFIED');
    if($('systemStatus'))$('systemStatus').className='pill amber';
    setText('modeNote',reason+' Trading authorization has NOT been refreshed.');
    for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=true;
    console.error('sag_operator_render_failure',String(error?.message||error));
    throw error;
  }
}
function invalidateStateReads(){
  stateReadEpoch++;stateReadSequence++;pendingRenderState=null;
  capitalLiveMarks.clear();capitalLastMarksAtMs=0;
}
function scheduleRender(s,epoch=stateReadEpoch){
  if(epoch!==stateReadEpoch||modeChangePending)return;
  pendingRenderState={state:s,epoch,sequence:++stateReadSequence};
  if(renderFrame)return;
  const flush=()=>{renderFrame=0;const latest=pendingRenderState;pendingRenderState=null;
    if(latest&&latest.epoch===stateReadEpoch&&latest.sequence===stateReadSequence&&!modeChangePending){
      try{render(latest.state);}catch{retryStartupRead(latest.epoch);}
    }};
  renderFrame=(window.requestAnimationFrame||((fn)=>setTimeout(fn,0)))(flush);
}
function retryStartupRead(epoch){
  if(bootRetryTimer!==null)return;
  bootRetryTimer=setTimeout(()=>{
    bootRetryTimer=null;
    if(epoch===stateReadEpoch&&!modeChangePending)void load();
  },2000);
}
function renderStartupStatus(boot={}){
  const status=boot.lastError?'STARTUP RETRY':'STARTING';
  const reason=boot.lastErrorMessage||'The engine is initializing. The dashboard will reconnect automatically.';
  const details=[boot.lastErrorStage,boot.lastError].filter(Boolean).join(' / ');
  setText('systemStatus',status);if($('systemStatus'))$('systemStatus').className='pill amber';
  setText('engineStatus','Engine not ready');if($('engineStatus'))$('engineStatus').className='pill amber';
  setText('modeNote',reason+(details?' ['+details+']':''));
  markFinancialSnapshotUnavailable(reason+(details?' ['+details+']':''));
  // No mode/state is invented before the first real engine snapshot.
  if(!STATE)for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=true;
}
// R5: distinguish a running engine from an unavailable state collection.
// This does not restore financial values or trading authority from a stale read.
function renderOperatorStateUnavailable(info={}){
  const stage=['financial_performance','shadow_projection','legacy_exposure','optional_telemetry','final_projection','idle'].includes(info.stage)
    ?info.stage:'unknown';
  const reason=info.error==='operator_state_timeout'
    ?'Verified engine is running, but the operator-state collection timed out.'
    :'Verified engine is running, but the operator-state collection is unavailable.';
  const message=reason+' Stage: '+stage+'. Retrying; no financial snapshot or LIVE authorization is assumed.';
  setText('systemStatus','STATE DELAYED');
  if($('systemStatus'))$('systemStatus').className='pill amber';
  setText('engineStatus','Engine running / state delayed');
  if($('engineStatus'))$('engineStatus').className='pill amber';
  setText('modeNote',message);
  markFinancialSnapshotUnavailable(message);
  for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=true;
}
// Operator-state READ resiliency only. A stalled database-backed state response
// must not leave a blank page or a seemingly enabled LIVE control forever.
// A timeout never grants authorization or changes trading engine state.
const OPERATOR_STATE_READ_TIMEOUT_MS=15_000;
async function load(allowLogin=false){
  const sequence=++stateReadSequence,epoch=stateReadEpoch;
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),OPERATOR_STATE_READ_TIMEOUT_MS);
  try{
    const r=await operatorFetch('/api/state',{cache:'no-store',signal:controller.signal},allowLogin);
    const j=await r.json();
    if(sequence!==stateReadSequence||epoch!==stateReadEpoch||modeChangePending)return null;
    if(!r.ok&&j.error==='engine_booting'){renderStartupStatus(j.boot||{});retryStartupRead(epoch);return null;}
    if(!r.ok&&['operator_state_timeout','operator_state_unavailable'].includes(j.error)){
      renderOperatorStateUnavailable(j);retryStartupRead(epoch);return null;
    }
    if(!r.ok)throw new Error(`Operator state HTTP ${r.status}; snapshot unavailable`);
    if(!j||!j.settings||!j.health||!['SIMULATION','LIVE'].includes(j.settings.mode)||typeof j.settings.liveArmed!=='boolean')throw new Error('Operator state response incomplete');
    render(j);return j;
  }catch(e){
    if(sequence!==stateReadSequence||epoch!==stateReadEpoch||modeChangePending)return null;
    // A newer state read or SSE update wins by the sequence/epoch check above.
    // Never treat a merely existing STATE as proof of fresh LIVE authorization.
    const reason=controller.signal.aborted
      ?'Operator state request timed out; connection or database state read may be delayed.'
      :'Operator state unavailable; the engine may still be running.';
    console.error('sag_operator_state_read_unavailable',controller.signal.aborted?'timeout':String(e?.name||'state_error'));
    markFinancialSnapshotUnavailable(reason);msg(reason,true);
    if(!STATE)renderStartupStatus({lastErrorMessage:reason+' Automatic retry is active.'});
    else {setText('systemStatus','DISPLAY UNVERIFIED');if($('systemStatus'))$('systemStatus').className='pill amber';
      setText('modeNote',reason+' Reconnection will retry automatically.');}
    for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=true;
    retryStartupRead(epoch);
    return null;
  }finally{clearTimeout(deadline);}
}
async function patchSettingsVerified(data){
  // PATCH returns the committed settings card, not an operator-state snapshot.
  // Verify the acknowledgement before clearing drafts, then refresh the board.
  const reply=await patch('/api/settings',data);
  const suppliedState=reply?.state?.settings?reply.state:reply?.settings?reply:null;
  const committed=suppliedState?.settings||reply;
  const verify=(settings)=>{for(const [key,value] of Object.entries(data)){
    const actual=settings?.[key];
    const matches=typeof value==='boolean'?actual===value:
      typeof value==='number'?Number.isFinite(Number(actual))&&Number(actual)===value:
      String(actual??'')===String(value??'');
    if(!matches)throw new Error(`Setting ${key} did not persist exactly`);
  }};
  verify(committed);
  if(suppliedState){acknowledgeSavedDrafts(data);return suppliedState;}
  const response=await operatorFetch('/api/state',{cache:'no-store'},true);
  if(!response.ok)throw new Error(`Settings saved, but dashboard refresh failed (HTTP ${response.status}).`);
  const fresh=await response.json();
  if(!fresh?.settings)throw new Error('Settings saved, but the dashboard response has no settings.');
  verify(fresh.settings);
  acknowledgeSavedDrafts(data);
  return fresh;
}
function bindBoard(id){const b=$(id);b.oninput=e=>{const i=e.target.closest('[data-setting-key]');if(i)drafts.set(i.dataset.settingKey,i.value);};b.onclick=async e=>{const save=e.target.closest('[data-model-save]');if(save){if(save.dataset.modelSave==='Crystal Wall Recovery'&&!cw1UiBackendCompatible(STATE)){msg('Crystal Wall settings cannot be saved: the CW1 backend does not match this dashboard.',true);return;}if(save.dataset.modelSave==='Great Horn Recovery'&&!gh1UiBackendCompatible(STATE)){msg('Great Horn settings cannot be saved: the GH1 backend build does not match this dashboard.',true);return;}const row=save.closest('tr'),data={};for(const i of row.querySelectorAll('[data-setting-key]')){if(i.value.trim()===''||!i.checkValidity()){i.reportValidity();msg(`Invalid ${i.closest('label')?.firstChild?.textContent||i.dataset.settingKey}: ${i.validationMessage||'a value is required'}`,true);return;}data[i.dataset.settingKey]=Number(i.value);}save.disabled=true;try{const fresh=await patchSettingsVerified(data);render(fresh);msg(`${save.dataset.modelSave} settings saved.`);}catch(x){msg(x.message,true);}finally{save.disabled=false;}return;}const btn=e.target.closest('[data-model-key]');if(!btn)return;const key=btn.dataset.modelKey,enable=btn.dataset.enabled!=='true';if(key.startsWith('crystalWallRecovery')&&!cw1UiBackendCompatible(STATE)){msg('Crystal Wall controls are disabled until the CW1 backend report verifies.',true);return;}if(key.startsWith('greatHorn')&&!gh1UiBackendCompatible(STATE)){msg('Great Horn controls are disabled: verify the GH1 backend build first.',true);return;}btn.disabled=true;try{const fresh=await patchSettingsVerified({[key]:enable});render(fresh);msg(`${btn.dataset.modelName} ${enable?'enabled':'disabled'}.`);}catch(x){msg(x.message,true);}finally{btn.disabled=false;}};}
bindBoard('attackBody');bindBoard('cosmoBody');
$('settingsForm').oninput=e=>{const i=e.target.closest('[data-setting-key]');if(i)drafts.set(i.dataset.settingKey,i.value);};
$('settingsForm').onsubmit=async e=>{e.preventDefault();const data={};for(const [k] of SHARED)if(drafts.has(k))data[k]=Number(drafts.get(k));if(!Object.keys(data).length)return msg('No shared setting changes.');try{const fresh=await patchSettingsVerified(data);render(fresh);msg('Shared settings saved and verified.');}catch(x){msg(x.message,true);}};
$('atomicThunderGreenSave').onclick=async()=>{const data={atomicThunderGreenTriggerCents:Number($('atomicThunderGreenTrigger').value)};try{render(await patchSettingsVerified(data));msg('Atomic Thunder GREEN trigger saved. New threshold applies to future green crossings; already emitted shadow Bolts remain one-shot.');}catch(e){msg(e.message,true);}};
$('infinitySave').onclick=async()=>{const data={infinityBreakMinNetPerOriginalContractCents:Number($('infinityMinNet').value),infinityBreakRequiredConfirmations:Number($('infinityConfirmations').value),infinityBreakMaximumBookAgeMs:Number($('infinityBookAge').value),infinityBreakConfirmationWindowMs:Number($('infinityWindow').value)};try{render(await patchSettingsVerified(data));msg('Infinity Break settings saved.');}catch(e){msg(e.message,true);}};
$('auroraSave').onclick=async()=>{try{render(await patchSettingsVerified({auroraDamageControlPercent:Number($('auroraDamagePercent').value),auroraStopWindowMinutes:Number($('auroraStopWindowMinutes').value)}));msg('Aurora saved. Damage % applies to new trades. Stop window is the real clock and open trades pick it up on the next protection check.');}catch(e){msg(e.message,true);}};
$('galacticExplosionToggle').onclick=async()=>{const on=$('galacticExplosionToggle').dataset.enabled==='true';if(!on&&!confirm('Enable Galactic Explosion? Every enabled saint that is inside its own price band and confirmation settings may enter the SAME ticker. The one-hunter-per-event cap becomes per-Attack. Crystal Wall and Justice Arrow stay on their own crash path and can also sit on that ticker.'))return;try{render(await patchSettingsVerified({galacticExplosionEnabled:!on}));}catch(e){msg(e.message,true);}};
$('openHunterBody').onclick=async e=>{const b=e.target.closest('[data-emergency-entry]');if(!b)return;if(!confirm(`Emergency exit ${b.dataset.emergencyName||'this Attack'}?`))return;b.disabled=true;try{const r=await post('/api/emergency-exit',{entryId:b.dataset.emergencyEntry});await load();msg(r.closed?'Emergency Exit completed.':r.pending?'Emergency Exit committed; reconciliation pending.':`Not executed: ${r.skipped||r.reason||'unknown'}`,!r.closed&&!r.pending);}catch(x){msg(x.message,true);}finally{b.disabled=false;}};
// Legacy real positions remain controllable outside the current Lightning board.
$('legacyRealExposureBody').onclick=$('openHunterBody').onclick;
$('modeBtn').onclick=async()=>{
  const button=$('modeBtn');if(modeChangePending||button.disabled)return;button.disabled=true;
  let attempted=false,acknowledged=false,target=null;
  try{
    const live=STATE.settings.mode==='LIVE';
    target=live?'SIMULATION':'LIVE';
    const phrase=target==='LIVE'?prompt('Type ENABLE LIVE TRADING to arm real Kalshi orders.'):null;
    if(target==='LIVE'&&phrase==null)return;
    attempted=true;modeChangePending=true;invalidateStateReads();
    if(operatorEventStream){operatorEventStream.close();operatorEventStream=null;}

    const ack=await post('/api/mode',{mode:target,...(target==='LIVE'?{confirmation:phrase}:{})});
    if(ack.mode!==target||ack.liveArmed!==(target==='LIVE'))throw new Error(target==='LIVE'?'mode_arm_acknowledgement_mismatch':'mode_disarm_acknowledgement_mismatch');
    acknowledged=true;windowModeArmDenial='';
    // Only the mode acknowledgement is authoritative here, not old account
    // values. Leave balances unavailable until the fresh scoped read arrives.
    STATE={...STATE,settings:{...STATE.settings,...ack}};
    modeChangePending=false;invalidateStateReads();
    const fresh=await load();
    if(!fresh){
      markFinancialSnapshotUnavailable('Mode committed; a fresh financial snapshot is still required.');
      setText('modeBtn',target==='LIVE'?'DISABLE LIVE':'ENABLE LIVE');
      setText('modeNote',target==='LIVE'?'LIVE armed; financial snapshot unavailable':'SIMULATION committed; fresh state pending — Paper trading.');
    }
  }catch(e){
    windowModeArmDenial=(target==='SIMULATION'?'SIMULATION transition failed: ':'LIVE activation refused: ')+String(e.message||e);
    setText('modeNote',windowModeArmDenial);msg(windowModeArmDenial,true);
  }finally{
    modeChangePending=false;button.disabled=false;
    if(attempted){syncOperatorUpdates(STATE);if(!acknowledged)void load();}
  }
};
$('engineBtn').onclick=async()=>{try{await post('/api/engine',{active:!STATE.settings.engineActive});await load();}catch(e){msg(e.message,true);}};
// Same backend authorization route and phrase as SIMULATION -> LIVE. Only
// exposes the already-supported LIVE/disarmed -> LIVE/armed operator operation;
// it neither starts the engine nor bypasses any broker/reconciliation checks.
$('liveRearmBtn').onclick=async()=>{
  const button=$('liveRearmBtn');
  if(!STATE?.settings||modeChangePending||button.disabled||STATE.settings.mode!=='LIVE'||STATE.settings.liveArmed===true)return;
  button.disabled=true;let attempted=false,acknowledged=false;
  try{
    const phrase=prompt('Type ENABLE LIVE TRADING to reauthorize real Kalshi orders.');
    if(phrase==null)return;
    attempted=true;modeChangePending=true;invalidateStateReads();
    if(operatorEventStream){operatorEventStream.close();operatorEventStream=null;}
    const ack=await post('/api/mode',{mode:'LIVE',confirmation:phrase});
    if(ack?.mode!=='LIVE'||ack.liveArmed!==true)throw new Error('live_rearm_acknowledgement_mismatch');
    acknowledged=true;windowModeArmDenial='';
    STATE={...STATE,settings:{...STATE.settings,...ack}};
    modeChangePending=false;invalidateStateReads();
    const fresh=await load();
    if(!fresh){
      markFinancialSnapshotUnavailable('LIVE reauthorization committed; fresh financial snapshot pending.');
      setText('modeNote','LIVE reauthorized; fresh state pending — financial data unavailable.');
      renderLiveAuthorization(STATE);
    }
  }catch(e){
    windowModeArmDenial='LIVE reauthorization refused: '+String(e.message||e);
    setText('modeNote',windowModeArmDenial);msg(windowModeArmDenial,true);
  }finally{
    modeChangePending=false;button.disabled=false;
    if(attempted){syncOperatorUpdates(STATE);if(!acknowledged)void load();}
  }
};
const scan=async()=>{try{await post('/api/run-scan');msg('Scan requested.');}catch(e){msg(e.message,true);}};$('scanBtn').onclick=scan;$('modelScanBtn').onclick=scan;
$('resetDefaultsBtn').onclick=async()=>{
  const button=$('resetDefaultsBtn');
  if(button.disabled||!confirm('Reset all operator settings to factory defaults? Open trades stay. This does not wipe learning.'))return;
  button.disabled=true;
  try{
    // The server commits and reads back the full factory card before replying.
    // An HTTP success without a committed settings object is not an acknowledgement.
    const committed=await post('/api/reset-defaults');
    if(!committed||typeof committed!=='object'||Array.isArray(committed)||!Object.hasOwn(committed,'greatHornMultiply'))
      throw new Error('Factory settings reset was not verified by the server.');
    // A full factory reset deliberately discards ALL unsaved operator drafts.
    // Otherwise attack inputs and shared forms keep rendering their old values.
    drafts.clear();
    if(document.activeElement?.matches('[data-setting-key]'))document.activeElement.blur();
    invalidateStateReads();
    if(operatorEventStream){operatorEventStream.close();operatorEventStream=null;}
    ATTACK_CONTROL_FINGERPRINT=null;CONTROL_FINGERPRINT=null;
    const fresh=await load();
    if(!fresh?.settings)throw new Error('Factory settings saved, but dashboard refresh failed. Reload the dashboard to view saved values.');
    // Compare the saved operator card, not unrelated engine/mode/reset controls
    // that can be changed by an independent safety action during the refresh.
    const runtimeKeys=new Set(['mode','liveArmed','engineActive','systemName','ownerId',
      'resetTimestampMs','liveDashboardStartMs','simulationDashboardStartMs',
      'factoryTradingProfile20261005Applied','athenaArrowCloneApplied','winningCard20261005Applied',
      'card20261006Applied','card20261006SessionApplied','card20261007LiveApplied','card20261008Applied']);
    const factoryChecks=['lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents','greatHornMinEntryCents','greatHornMaxEntryCents','auroraStopWindowMinutes'];
    for(const key of factoryChecks){
      if(Object.hasOwn(committed,key)&&Object.hasOwn(fresh.settings,key)&&fresh.settings[key]!==committed[key])
        throw new Error(`Factory settings saved, but the refreshed value for ${key} differs. Reload the dashboard.`);
    }
    for(const [key,value] of Object.entries(committed)){
      if(runtimeKeys.has(key)||!Object.hasOwn(fresh.settings,key))continue;
      if(fresh.settings[key]!==value)
        throw new Error(`Factory settings saved, but the refreshed value for ${key} differs. Reload the dashboard.`);
    }
    msg('Factory settings restored and verified.');
  }catch(e){msg(e.message,true);}
  finally{button.disabled=false;}
};
$('resetDashboardBtn').onclick=async()=>{if(!confirm('Start a fresh dashboard reporting period and stop new entries? All prior trades, LIVE positions, protections and trading epochs stay intact. Click Start Engine to resume; re-arm LIVE with the existing confirmation phrase if needed.'))return;try{await post('/api/reset-dashboard');await load();}catch(e){msg(e.message,true);}};
$('resetSimulationBtn').onclick=async()=>{if(!confirm('Archive this simulation, clear the book, and stop new entries? Click Start Engine to trade again.'))return;try{await post('/api/reset-simulation');await load();}catch(e){msg(e.message,true);}};
$('athenaRebuildBtn').onclick=async()=>{if(!confirm('Refresh Athena A3 economic memory from the complete stored Sagittarius history? This is allowed only under the server safety gate.'))return;try{await post('/api/athena/rebuild');await load();msg('Athena A3 economic memory refreshed.');}catch(e){msg(e.message,true);}};
$('credentialsForm').onsubmit=async e=>{e.preventDefault();try{const systemName=$('systemNameInput').value.trim();if(systemName){$('systemNameInput').value=systemName;if(drafts.has('systemName'))drafts.set('systemName',systemName);if(systemName!==STATE.settings.systemName)await patchSettingsVerified({systemName});else acknowledgeSavedDrafts({systemName});}const keyId=$('apiKeyInput').value.trim(),privateKeyPem=$('privateKeyInput').value.trim();if(keyId&&privateKeyPem)await post('/api/credentials',{keyId,privateKeyPem});else if(keyId||privateKeyPem)throw new Error('Enter both API Key ID and private key PEM.');$('privateKeyInput').value='';await load();msg('Configuration saved.');}catch(x){msg(x.message,true);}};
$('testConnectionBtn').onclick=async()=>{try{await post('/api/test-connection');await load();msg('Kalshi REST authentication successful.');}catch(e){msg(e.message,true);}};
$('cosmoShadowFilter')?.addEventListener('click',e=>{const b=e.target.closest('[data-cosmo-filter]');if(!b)return;COSMO_FILTER=b.dataset.cosmoFilter||'ALL';if(STATE)renderTrades(STATE);});
for(const id of ['openCosmoSignalsFold','closedPositionsFold','trackedMarketsFold'])$(id)?.addEventListener('toggle',()=>{if(STATE)renderTrades(STATE);});
function clock(){setText('madridClock',new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'short'}).format(new Date())+' Europe/Madrid');}
let operatorEventStream=null;
function syncOperatorUpdates(s){
  if(modeChangePending)return;
  // SSE works in both SIM and LIVE without password, pairing, or polling.
  // A successful arm/disarm closes the previous stream and advances the
  // state epoch before a new stream is opened.
  if(!operatorEventStream){
    const epoch=stateReadEpoch,stream=new EventSource('/api/events');operatorEventStream=stream;
    stream.onmessage=e=>{
      if(stream!==operatorEventStream||epoch!==stateReadEpoch||modeChangePending)return;
      try{
        const next=JSON.parse(e.data);
        // Only a properly scoped, parseable operator state can reestablish
        // current authorization visibility after a connection interruption.
        if(!['LIVE','SIMULATION'].includes(next?.settings?.mode)
           ||typeof next.settings.liveArmed!=='boolean')return;
        liveAuthorizationUnverified=false;
        scheduleRender(next,epoch);
      }catch{}
    };
    if(typeof stream.addEventListener==='function')stream.addEventListener('capital_marks',e=>{
      if(stream!==operatorEventStream||epoch!==stateReadEpoch||modeChangePending)return;
      try{applyCapitalMarks(JSON.parse(e.data));}catch{}
    });
    stream.onerror=()=>{
      if(stream!==operatorEventStream||epoch!==stateReadEpoch||modeChangePending)return;
      capitalLiveMarks.clear();capitalLastMarksAtMs=0;
      operatorStreamDisconnected=true;
      liveAuthorizationUnverified=true;
      renderLiveAuthorization(STATE);
      updateVisibleCapitalMarks();
      const stale='Update stream disconnected. Displayed values are the last received snapshot, not live totals.';
      setText('capitalAttackResultsStatus',stale);
      setText('capitalCombinedFinancialStatus',stale+' Combined figures have not been refreshed.');
      for(const kind of ['open','closed']){
        const ids=capitalHistoryIds(kind);
        const prior=capitalHistory[kind]?.lastFetchedAt
          ?' Last fetched '+new Date(capitalHistory[kind].lastFetchedAt).toLocaleTimeString()+'.':'';
        setText(ids.status,stale+prior);
      }
      setText('hunterSummary','Capital positions reflect the last received snapshot while updates are disconnected.');
    };
  }
}
setInterval(clock,1000);clock();renderStartupStatus({lastErrorMessage:'Connecting to verified Sagittarius engine state...'});void load(true);

$('freezingCoffinToggle').onclick=async()=>{const on=$('freezingCoffinToggle').dataset.enabled==='true';if(!on&&!confirm('Enable Freezing Coffin for future shadow Saint entries? These virtual parents use the saved cent drop. Starlight always keeps its own Aurora. Existing positions retain their frozen protection.'))return;try{render(await patchSettingsVerified({freezingCoffinEnabled:!on}));}catch(e){msg(e.message,true);}};
$('andromedaThunderWaveToggle').onclick=async()=>{const on=$('andromedaThunderWaveToggle').textContent==='ON';try{render(await patchSettingsVerified({andromedaThunderWaveEnabled:!on,andromedaThunderWaveLevel:$('andromedaThunderWaveLevel')?.value||'HIGH'}));}catch(e){msg(e.message,true);}};
$('andromedaThunderWaveLevel').onchange=async()=>{try{render(await patchSettingsVerified({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:$('andromedaThunderWaveLevel').value}));}catch(e){msg(e.message,true);}};

$('freezingCoffinSave').onclick=async()=>{try{render(await patchSettingsVerified({freezingCoffinMaxDropCents:Number($('freezingCoffinDrop').value)}));msg('Freezing Coffin drop saved for future virtual parent entries. Starlight keeps its own Aurora.');}catch(e){msg(e.message,true);}};

// Main financial boards have a final display boundary as well as SQL filtering.
function dashboardRowIdentityMatches(e,settings){return !!e&&!e.archived&&['systemName','ownerId','mode'].every(k=>e[k]!=null&&String(e[k])===String(settings?.[k]));}
function dashboardRowScopeMatches(e,settings){return !!e&&!e.archived&&['systemName','ownerId','mode'].every(k=>e[k]!=null&&String(e[k])===String(settings?.[k]))
  &&Number(e.openedAtMs)>=effectiveDashboardStartMs(settings);}
function isCapitalLightning(e,settings){return e?.conceptName==='Lightning Plasma'
  &&e.executionClass!=='SHADOW_SAINT'&&e.entryConfig?.executionClass!=='SHADOW_SAINT'&&dashboardRowScopeMatches(e,settings);}
let shadowHistoryCursor=null,shadowHistoryPinned=false,shadowHistoryScope='';
function renderLegacyCapitalHistory(s){
  const a=capitalAttackTableReport(s,'Crash Recovery Hunter','SC1','starlightCapitalPerformance'),valid=a.available===true;
  const rows=(s.legacyClosedHunters||[]).filter(e=>e.conceptName==='Crash Recovery Hunter'&&e.executionClass!=='SHADOW_SAINT'
    &&e.entryConfig?.executionClass!=='SHADOW_SAINT'&&e.status==='closed'&&Number(e.count)>0&&dashboardRowScopeMatches(e,s.settings));
  $('legacyCapitalHistoryPanel')?.classList.toggle('hidden',!valid||(Number(a.total||0)===0&&Number(a.pending||0)===0));
  setText('legacyCapitalHistoryCount',valid?`(${a.closed||0} closed; ${rows.length} recent rows)`:'');
  setText('legacyCapitalSummary',valid?`Confirmed REAL Starlight capital only. ${a.closed||0} closed · ${a.wins||0} wins / ${a.losses||0} losses · win rate ${a.closed?pct01(a.wins/a.closed):'-'} · realized ${financialMoney(a.realizedCents)} · unrealized ${financialMoney(a.valuationComplete?a.unrealizedCents:null)}. Included once in the main seven-attack results; shadow Starlight is excluded.`:'Starlight capital history unavailable.');
  if($('legacyClosedBody'))$('legacyClosedBody').innerHTML=rows.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>Starlight Extinction · capital</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td><td>${e.closedAtMs?new Date(e.closedAtMs).toLocaleString():'-'}</td></tr>`).join('')||'<tr><td colspan="7">No closed real Starlight positions in this scope.</td></tr>';
}
function renderShadowDashboard(s){
  renderLegacyCapitalHistory(s);
  const scope=JSON.stringify([s.settings?.systemName,s.settings?.ownerId,s.settings?.mode,s.settings?.resetTimestampMs,currentDashboardStartMs(s.settings)]);
  if(scope!==shadowHistoryScope){
    shadowHistoryScope=scope;shadowHistoryPinned=false;shadowHistoryCursor=null;
    if($('shadowPeriodFilter')?.value==='previous'){
      shadowHistoryPinned=true;renderShadowSaints([]);
      setText('shadowHistoryMessage','Historical periods selected. Refresh to load older-reset virtual records for this owner and mode.');
    }
  }
  renderShadowSaintSummary(s);
  const d=s.shadowDiagnostics||{},worker=d.worker||{},summary=d.summary;
  const age=worker.lastSuccessAtMs?duration(Date.now()-worker.lastSuccessAtMs):'never';
  const currentCounts=summary?.classification==='VIRTUAL_ONLY'&&summary?.scope?.resetEpoch===Number(s.settings?.resetTimestampMs)
    ?`${summary.open} open · ${summary.closed} closed`:'current-period counts unavailable';
  setText('shadowWorkerStatus',`${d.error||worker.degraded?'DEGRADED':'Virtual worker'} · CURRENT RESET · ${currentCounts} · last successful sweep ${age} · errors ${worker.errors||0} · waits ${worker.waits||0}${worker.lastError?' · '+worker.lastError:''}${summary?.unverified_legacy?' · '+summary.unverified_legacy+' unverified old shadow records quarantined':''}`);
  if(!shadowHistoryPinned&&$('shadowPeriodFilter')?.value!=='previous'){renderShadowSaints(s.shadowSaints||[]);shadowHistoryCursor=d.nextCursor||null;}
  const rows=(s.legacyRealExposure||[]).filter(e=>e.executionClass!=='SHADOW_SAINT'&&e.entryConfig?.executionClass!=='SHADOW_SAINT'
    &&String(e.systemName)===String(s.settings?.systemName)&&String(e.ownerId)===String(s.settings?.ownerId)&&!e.archived);
  $('legacyRealExposurePanel')?.classList.toggle('hidden',rows.length===0);
  setText('legacyRealExposureCount',`(${rows.length})`);
  if($('legacyRealExposureBody'))$('legacyRealExposureBody').innerHTML=rows.map(e=>`<tr><td>${esc(e.conceptName)}</td><td>${esc(e.ticker)}</td><td>${esc(e.mode)}</td><td>${esc(e.remainingCount??e.count)}</td><td>${esc(e.status)}</td><td><button class="btn emergency-exit" data-emergency-entry="${esc(e.id)}" data-emergency-name="${esc(e.conceptName)}">Emergency Exit</button></td></tr>`).join('');
}
function renderShadowSaints(rows){
  const body=$('shadowSaintBody');if(!body)return;
  setText('shadowSaintCount',`(${rows.length} displayed)`);
  body.innerHTML=rows.map(e=>{const r=e.recovery||{};return `<tr><td>${esc(e.conceptName)}<br><small>${esc(e.id)}</small></td><td>${esc(e.ticker)}</td><td>${esc(e.mode)} / ${esc(e.shadowEpoch??'-')}</td><td>${esc(e.remainingCount??e.count)} / ${esc(e.count)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.status==='closed'?e.exitPriceCents:e.currentPriceCents)}</td><td>${pc(e.stopPriceCents)}</td><td>${esc(e.status)}<br>${esc(e.closeReason||e.waitReason||'')}</td><td>${money(Number(e.entryFeeCents||0)+Number(e.exitFeeCents||0))}</td><td>${e.status==='closed'?money(e.pnlCents):'Not realized'}</td><td>${e.verifiedProtocol?(e.virtualRecoveryVersion?'APS2 VIRTUAL STARLIGHT':'MW1-R3'):'UNVERIFIED LEGACY'}<br><a href="/api/shadow-saints/proof?parentId=${encodeURIComponent(e.id)}" target="_blank" rel="noopener">Full evidence</a><br>${esc(e.continuation?.state||e.deliveryStatus||r.status||'No stop handoff')}</td><td>${esc(e.continuation?('Lightning parent '+e.continuation.state+' / revision '+e.continuation.revision):(r.recoveredChildId||r.lastAttemptReason||r.terminalReason||'-'))}${e.sourceTradeId?'<br>Parent: '+esc(e.sourceTradeId):''}</td></tr>`;}).join('')||'<tr><td colspan="12">No virtual trades in this page.</td></tr>';
}
async function loadShadowHistory(older=false){
  const history=$('shadowPeriodFilter')?.value==='previous'?'previous':'current';
  const params=new URLSearchParams({limit:'100',history}),filter=$('shadowStatusFilter')?.value;
  if(filter)params.set('status',filter);
  if(older){if(!shadowHistoryCursor)return;for(const[k,v]of Object.entries(shadowHistoryCursor))params.set(k,String(v));}
  const initialScope=shadowHistoryScope;
  try{const response=await operatorFetch('/api/shadow-saints?'+params,{},true);if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const page=await response.json();
    // A slow history request cannot paint previous-owner, previous-mode, or
    // wrong-period data over a newly rendered state after a reset/reconnect.
    if(initialScope!==shadowHistoryScope||history!==($('shadowPeriodFilter')?.value||'current'))return;
    if(page.history!==history||!page.scope||!STATE?.settings
      ||String(page.scope.systemName)!==String(STATE.settings.systemName)
      ||String(page.scope.ownerId)!==String(STATE.settings.ownerId)
      ||String(page.scope.mode)!==String(STATE.settings.mode)
      ||Number(page.scope.resetEpoch)!==Number(STATE.settings.resetTimestampMs))
      throw new Error('Shadow history scope mismatch');
    shadowHistoryPinned=true;shadowHistoryCursor=page.nextCursor||null;renderShadowSaints(page.rows||[]);
    setText('shadowHistoryMessage',`${history==='previous'?'PREVIOUS RESETS · HISTORICAL ONLY':'CURRENT RESET'} · ${page.rows?.length||0} virtual records. ${shadowHistoryCursor?'Older records available.':'End of available history.'} None included in capital P/L.`);
  }catch(error){
    if(initialScope!==shadowHistoryScope)return;
    shadowHistoryPinned=true;shadowHistoryCursor=null;renderShadowSaints([]);
    setText('shadowHistoryMessage',`Virtual history unavailable: ${error.message}`);
  }
}
$('shadowRefreshBtn')?.addEventListener('click',()=>loadShadowHistory(false));
$('shadowOlderBtn')?.addEventListener('click',()=>loadShadowHistory(true));
$('shadowStatusFilter')?.addEventListener('change',()=>loadShadowHistory(false));
$('shadowPeriodFilter')?.addEventListener('change',()=>{
  shadowHistoryPinned=true;shadowHistoryCursor=null;renderShadowSaints([]);loadShadowHistory(false);
});
// Initial operator actions are denied until a fully rendered authenticated state.
if(!STATE)for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=true;
