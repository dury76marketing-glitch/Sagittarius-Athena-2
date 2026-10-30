let STATE=null;
let COSMO_FILTER='ALL';
let CONTROL_FINGERPRINT='';
let ATTACK_CONTROL_FINGERPRINT='';
let pendingRenderState=null,renderFrame=0;
let stateReadSequence=0,stateReadEpoch=0,modeChangePending=false;
let bootRetryTimer=null;
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
  for(const id of ['portfolioValue','simFreeCash','winRate','unrealized','realized','profitToday','profitWeek','profitMonth','profitYear','openCount','closedPerfCount'])setText(id,'Unavailable');
  setText('executionFinancialStatus',reason+' Last trade rows are retained for identification; no fresh financial total is asserted.');
}
function financialScopeMatches(scope,settings){
  return !!scope&&!!settings&&['systemName','ownerId','mode'].every(k=>scope[k]!=null&&String(scope[k])===String(settings[k]))
    &&Number(scope.resetTimestampMs||0)===Number(settings.resetTimestampMs||0);
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
   &&Number(e.openedAtMs||0)>=Number(settings.resetTimestampMs||0)
   &&financialScopeMatches({systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetTimestampMs:settings.resetTimestampMs},settings);
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
   &&Number(e.openedAtMs||0)>=Number(settings.resetTimestampMs||0)
   &&financialScopeMatches({systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetTimestampMs:settings.resetTimestampMs},settings);
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
function capitalCombinedPerformance(s){
 const lightning=lightningPerformance(s),horn=verifiedGreatHornPerformance(s),wall=verifiedCrystalWallRecoveryPerformance(s);
 if(!lightning.available||!horn.available||!wall.available)
   return {available:false,reason:'Matching Lightning Plasma, Great Horn and Crystal Wall capital reports are required.'};
 if(lightning.asOfMs!==horn.asOfMs||horn.asOfMs!==wall.asOfMs)
   return {available:false,reason:'The three capital reports have different snapshot times.'};
 if(!capitalCounts.every(k=>numericReportValue(lightning[k])&&Number(lightning[k])>=0)
   ||!numericReportValue(lightning.realizedCents)
   ||(lightning.valuationComplete!==false&&!numericReportValue(lightning.unrealizedCents)))
   return {available:false,reason:'The Lightning capital report has incomplete core metrics.'};
 const reports=[lightning,horn,wall],result={available:true,asOfMs:lightning.asOfMs};
 for(const k of capitalCounts)result[k]=reports.reduce((sum,r)=>sum+Number(r[k]),0);
 result.winRate=result.closed>0?result.wins/result.closed:null;
 result.realizedCents=reports.reduce((sum,r)=>sum+Number(r.realizedCents),0);
 result.valuationComplete=reports.every(r=>r.valuationComplete!==false);
 result.unrealizedCents=result.valuationComplete
   ?reports.reduce((sum,r)=>sum+Number(r.unrealizedCents),0):null;
 for(const period of capitalPeriods){
   const k=period+'RealizedCents';
   result[k]=reports.every(r=>r.periodsComplete?.[period]!==false&&numericReportValue(r[k]))
     ?reports.reduce((sum,r)=>sum+Number(r[k]),0):null;
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
    ?'Capital only: verified Lightning Plasma + Great Horn Recovery + Crystal Wall Recovery for the same owner, system, mode, reset and snapshot. Virtual Athena/Starlight, legacy CI1 Crystal Wall and other legacy exposure are excluded. '+
      (c.valuationComplete?'Open positions marked at current bid; liquidation is not guaranteed.':'Unrealized P/L is unavailable because one or more capital marks are incomplete.')
    :'Combined capital results unavailable: '+c.reason+' No cross-scope or legacy total is substituted.');
}
function renderGreatHornFinancialDetail(s){
 const root=$('greatHornFinancialStatus');if(!root)return;
 const a=verifiedGreatHornPerformance(s),valid=a.available===true;
 const warning=$('gh1BuildWarning');
 if(warning){
   warning.classList.toggle('hidden',valid);
   warning.textContent=valid?'':
     'GREAT HORN REPORT UNVERIFIED: '+a.reason+' Running source: '+
     String(s?.build?.id||s?.release||'unknown')+
     '. Great Horn controls and totals remain unavailable until the matching backend contract is verified. Existing positions and protective exits remain protected.';
 }
 const opens=valid?(s.greatHornOpenPositions||[]).filter(e=>isCapitalGreatHorn(e,s.settings)):[];
 const closed=valid?(s.greatHornClosedPositions||[]).filter(e=>isCapitalGreatHorn(e,s.settings)):[];
 setText('greatHornOpenCount',valid?`(${opens.length} shown)`:'(unavailable)');
 setText('greatHornClosedCount',valid?`(${closed.length} shown)`:'(unavailable)');
 const available=(name,value)=>setText(name,valid?value:'Unavailable');
 available('gh1Open',a.open);available('gh1Closed',a.closed);
 available('gh1WinsLosses',`${a.wins} / ${a.losses}`);
 available('gh1WinRate',Number(a.closed)>0?pct01(Number(a.wins)/Number(a.closed)):'-');
 available('gh1Pending',a.pending);
 available('gh1LinkState',s?.settings?.greatHornLinkEnabled===true?'ON':'OFF');
 setFinancialPnl('gh1Realized',valid?a.realizedCents:null);
 setFinancialPnl('gh1Unrealized',valid&&a.valuationComplete!==false?a.unrealizedCents:null);
 for(const [id,period] of [['gh1Today','day'],['gh1Week','week'],['gh1Month','month'],['gh1Year','year']])
   setFinancialPnl(id,valid&&a.periodsComplete?.[period]!==false?a[period+'RealizedCents']:null);
 const parent=(e)=>{const g=e.entryConfig?.greatHornRecovery||{};return `${esc(g.parentEntryId||e.sourceTradeId||'unknown')} / ${esc(g.seat??'?')}`};
 if($('greatHornOpenBody'))$('greatHornOpenBody').innerHTML=opens.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>${parent(e)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentBidCents??e.currentPriceCents)}</td><td>${esc(e.remainingCount)}</td><td>${esc(e.status)}</td><td class="${pnlClass(e.positionPnlCents)}">${financialMoney(e.positionPnlCents)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No verified Great Horn open positions.</td></tr>';
 if($('greatHornClosedBody'))$('greatHornClosedBody').innerHTML=closed.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>${parent(e)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.count)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No verified Great Horn closed positions.</td></tr>';
 if(!valid){root.textContent='Great Horn capital results unavailable: '+a.reason+' No totals have been inferred.';return;}
 const release=s.settings?.mode==='LIVE'
   ?'LIVE release gate remains closed until native PostgreSQL, broker and Railway proof are recorded.'
   :'SIMULATION uses paper capital; live broker transmission is not authorized by this dashboard.';
 root.textContent=`${a.open} open / ${a.closed} closed; Realized ${financialMoney(a.realizedCents)}; ${a.valuationComplete===false?'Unrealized valuation incomplete':'Unrealized '+financialMoney(a.unrealizedCents)}. ${release}`;
}
function renderCrystalWallFinancialDetail(s){
 const root=$('crystalWallFinancialStatus');if(!root)return;
 const a=verifiedCrystalWallRecoveryPerformance(s),valid=a.available===true;
 const warning=$('cw1BuildWarning');
 if(warning){
   warning.classList.toggle('hidden',valid);
   warning.textContent=valid?'':
     'CRYSTAL WALL RECOVERY REPORT UNVERIFIED: '+a.reason+' Running source: '+
     String(s?.build?.id||s?.release||'unknown')+
     '. Crystal Wall Recovery controls and totals are unavailable until the matching backend contract is verified.';
 }
 const opens=valid?(s.crystalWallOpenPositions||[]).filter(e=>isCapitalCrystalWallRecovery(e,s.settings)):[];
 const closed=valid?(s.crystalWallClosedPositions||[]).filter(e=>isCapitalCrystalWallRecovery(e,s.settings)):[];
 setText('crystalWallOpenCount',valid?`(${opens.length} shown)`:'(unavailable)');
 setText('crystalWallClosedCount',valid?`(${closed.length} shown)`:'(unavailable)');
 const available=(id,value)=>setText(id,valid?value:'Unavailable');
 available('cw1Open',a.open);available('cw1Closed',a.closed);
 available('cw1WinsLosses',`${a.wins} / ${a.losses}`);
 available('cw1WinRate',Number(a.closed)>0?pct01(Number(a.wins)/Number(a.closed)):'-');
 available('cw1Pending',a.pending);
 available('cw1LinkState',s?.settings?.crystalWallRecoveryLinkEnabled===true?'ON':'OFF');
 setFinancialPnl('cw1Realized',valid?a.realizedCents:null);
 setFinancialPnl('cw1Unrealized',valid&&a.valuationComplete!==false?a.unrealizedCents:null);
 for(const [id,period] of [['cw1Today','day'],['cw1Week','week'],['cw1Month','month'],['cw1Year','year']])
   setFinancialPnl(id,valid&&a.periodsComplete?.[period]!==false?a[period+'RealizedCents']:null);
 const parent=(e)=>{const w=e.entryConfig?.crystalWallRecovery||{};
   return `${esc(w.parentEntryId||e.sourceTradeId||'unknown')} / ${esc(w.seat??'?')}`;};
 if($('crystalWallOpenBody'))$('crystalWallOpenBody').innerHTML=opens.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>${parent(e)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentBidCents??e.currentPriceCents)}</td><td>${esc(e.remainingCount)}</td><td>${esc(e.status)}</td><td class="${pnlClass(e.positionPnlCents)}">${financialMoney(e.positionPnlCents)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No verified Crystal Wall open positions.</td></tr>';
 if($('crystalWallClosedBody'))$('crystalWallClosedBody').innerHTML=closed.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>${parent(e)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.count)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No verified Crystal Wall closed positions.</td></tr>';
 if(!valid){root.textContent='Crystal Wall Recovery capital results unavailable: '+a.reason+' No totals have been inferred.';return;}
 const release=s.settings?.mode==='LIVE'
  ?'New Crystal Wall LIVE BUYs require a separate native database/broker release gate.'
  :'SIMULATION uses paper capital; LIVE broker transmission is not authorized by this dashboard.';
 root.textContent=`${a.open} open / ${a.closed} closed; Realized ${financialMoney(a.realizedCents)}; ${a.valuationComplete===false?'Unrealized valuation incomplete':'Unrealized '+financialMoney(a.unrealizedCents)}. ${release}`;
}
function actualAccountBalances(s){
  const a=s.accountBalances;
  return a?.scope==='ACTUAL_ACCOUNT_INCLUDING_LEGACY'&&financialScopeMatches(a,s.settings)?a:{};
}
function renderExecutionFinancialDetail(p){
  const root=$('executionAttackBreakdown');
  if(p.available===false){setText('executionFinancialStatus','Lightning-only snapshot unavailable or scope changed. No combined total is displayed.');if(root)root.textContent='Unavailable';return;}
  setText('executionFinancialStatus',`${p.wins??0} wins / ${p.losses??0} losses / ${p.scratches??0} break-even; ${p.pending??0} unconfirmed Lightning entry orders. ${p.valuationComplete===false?`${p.missingValuations??0} Lightning marks unavailable; unrealized total is incomplete.`:'Lightning positions marked at current bid, not guaranteed liquidation proceeds.'} ${p.asOfMs?'Snapshot '+new Date(p.asOfMs).toLocaleTimeString():''}`);
  if(!root)return;
  const a=p.byAttack['Lightning Plasma'];
  root.innerHTML=`<div class="stat"><strong>Lightning Plasma capital only</strong><span>Open ${a.open} / Closed ${a.closed}; Wins ${a.wins} / Losses ${a.losses}; Win rate ${pct01(a.winRate)}</span><span>Realized ${financialMoney(a.realizedCents)} / Unrealized ${financialMoney(a.unrealizedCents)}</span><span>Today ${financialMoney(a.dayRealizedCents)} / Week ${financialMoney(a.weekRealizedCents)}</span><span>Month ${financialMoney(a.monthRealizedCents)} / Year ${financialMoney(a.yearRealizedCents)}</span></div>`;
}


const ATTACKS=[
  {legacy:'Athena Exclamation',name:'Athena Exclamation',key:'athenaExclamationEnabled',x1:'athenaExclamationAthenaX1Enabled',stake:'athenaExclamationStakeCents',min:'athenaExclamationMinEntryCents',max:'athenaExclamationMaxEntryCents',multiply:'athenaExclamationMultiply',fields:[['athenaExclamationMinCrashCents','Min crash','c'],['athenaExclamationMinReboundCents','Min rebound','c'],['athenaExclamationMinUpwardTicks','Upward ticks',''],['athenaExclamationObservationMinutes','Observe','min'],['athenaExclamationMinProfitNetPerOriginalContractCents','Min profit target','c']],desc:'Independent CI1 crash-rebound Attack. Same card as Sagittarius Justice Arrow. Own crash/rebound/ticks. X1 ON uses Athena X1 after min profit; X1 OFF uses Infinity.'},
  {legacy:'Scarlet Needle',name:'Scarlet Needle',key:'scarletNeedleEnabled',x1:'scarletNeedleAthenaX1Enabled',stake:'scarletNeedleStakeCents',min:'scarletNeedleMinEntryCents',max:'scarletNeedleMaxEntryCents',multiply:'scarletNeedleMultiply',fields:[['scarletNeedleMinCrashCents','Min crash','c'],['scarletNeedleMinReboundCents','Min rebound','c'],['scarletNeedleMinUpwardTicks','Upward ticks',''],['scarletNeedleObservationMinutes','Observe','min'],['scarletNeedleMinProfitNetPerOriginalContractCents','Min profit target','c'],['scarletNeedleInfinityNetPerOriginalContractCents','Infinity profit target','c']],repeats:'scarletNeedleMaxRepeats',desc:'Athena-path Scarlet Attack. Same Cosmo GREEN → Bolt → Athena path as Great Horn. Own crash/rebound/ticks and optional Athena X1.'},
  {legacy:'Sagittarius Justice Arrow',name:'Sagittarius Justice Arrow',key:'justiceArrowEnabled',x1:'justiceArrowAthenaX1Enabled',stake:'justiceArrowStakeCents',min:'justiceArrowMinEntryCents',max:'justiceArrowMaxEntryCents',multiply:'justiceArrowMultiply',fields:[['justiceArrowMinCrashCents','Min crash','c'],['justiceArrowMinReboundCents','Min rebound','c'],['justiceArrowMinUpwardTicks','Upward ticks',''],['justiceArrowObservationMinutes','Observe','min'],['justiceArrowMinProfitNetPerOriginalContractCents','Min profit target','c']],desc:'Independent CI1 crash-rebound Attack. Own crash/rebound/ticks. X1 ON uses Athena X1 after min profit; X1 OFF uses Infinity.'},
  {legacy:'Wave Surfer',name:'Pegasus Ryu Sei Ken',key:'waveSurferEnabled',x1:'waveSurferAthenaX1Enabled',stake:'waveStakeCents',min:'waveMinEntryCents',max:'waveMaxEntryCents',multiply:'waveSurferMultiply',fields:[['waveSurferMinCrashCents','Min crash','c'],['waveSurferMinReboundCents','Min rebound','c'],['waveSurferMinUpwardTicks','Upward ticks',''],['waveSurferObservationMinutes','Observe','min'],['waveSurferMinProfitNetPerOriginalContractCents','Min profit target','c']],desc:'Athena-path Wave Attack with shared crash/rebound/ticks and optional Athena X1.'},
  {legacy:'Crash Recovery Hunter',name:'Starlight Extinction',key:'crashRecoveryHunterEnabled',x1:'crashRecoveryHunterAthenaX1Enabled',stake:'crashRecoveryStakeCents',min:'crashRecoveryMinEntryCents',max:'crashRecoveryMaxEntryCents',multiply:'crashRecoveryHunterMultiply',fields:[['athenaExclamationStarlightTriggerCents','Athena +c to enter','c'],['crashRecoveryHunterMinCrashCents','Min crash','c'],['crashRecoveryHunterMinReboundCents','Min rebound','c'],['crashRecoveryHunterMinUpwardTicks','Upward ticks',''],['crashRecoveryHunterObservationMinutes','Observe','min'],['crashRecoveryHunterMinProfitNetPerOriginalContractCents','Min profit target','c'],['crashRecoveryHunterAuroraDamageControlPercent','Aurora %','%']],desc:'Virtual-only recovery after a verified eligible shadow Saint stop. No broker orders or capital reservation. Editable Athena +c to enter on this Starlight card (0 disables extra rise trigger). Lightning Plasma shadow losses never authorize recovery. Own Aurora and X1/Infinity choice preserved.'},
  {legacy:'Recovery Hunter',name:'Crystal Wall (legacy CI1)',key:'recoveryHunterEnabled',x1:'recoveryHunterAthenaX1Enabled',stake:'recoveryStakeCents',min:'recoveryMinEntryCents',max:'recoveryMaxEntryCents',multiply:'recoveryHunterMultiply',fields:[['crystalWallMinCrashCents','Min crash','c'],['crystalWallMinReboundCents','Min rebound','c'],['crystalWallMinUpwardTicks','Upward ticks',''],['crystalWallObservationMinutes','Observe','min'],['recoveryHunterMinProfitNetPerOriginalContractCents','Min profit target','c']],desc:'Independent CI1 crash-rebound Attack. Own crash/rebound/ticks. X1 ON uses Athena X1; X1 OFF uses Infinity.'},
  {legacy:'Great Horn Recovery',name:'Great Horn',key:'greatHornEnabled',x1:'greatHornAthenaX1Enabled',stake:'greatHornStakeCents',min:'greatHornMinEntryCents',max:'greatHornMaxEntryCents',multiply:'greatHornMultiply',fields:[['greatHornMinCrashCents','Min crash','c'],['greatHornMinReboundCents','Min rebound','c'],['greatHornMinUpwardTicks','Upward ticks',''],['greatHornObservationMinutes','Observe','min'],['greatHornMaxSpreadCents','Max spread','c'],['greatHornParentEntryRiseCents','Lightning entry +c','c'],['greatHornMinProfitNetPerOriginalContractCents','Min profit target','c'],['greatHornAuroraDamageControlPercent','Aurora %','%']],desc:'GH1 recovery of verified Lightning losses. Independent Link / crash / rebound / upticks / observation / original Lightning entry +c / Aurora / profit model. SIM code present; LIVE is release-gated pending native deployment proof.'},
  {legacy:'Crystal Wall Recovery',name:'Crystal Wall — GH recovery',key:'crystalWallRecoveryEnabled',x1:'crystalWallRecoveryAthenaX1Enabled',stake:'crystalWallRecoveryStakeCents',min:'crystalWallRecoveryMinEntryCents',max:'crystalWallRecoveryMaxEntryCents',multiply:'crystalWallRecoveryMultiply',fields:[['crystalWallRecoveryMinCrashCents','Min crash','c'],['crystalWallRecoveryMinReboundCents','Min rebound','c'],['crystalWallRecoveryMinUpwardTicks','Upward ticks',''],['crystalWallRecoveryObservationMinutes','Observe','min'],['crystalWallRecoveryMaxSpreadCents','Max spread','c'],['crystalWallRecoveryParentEntryRiseCents','Great Horn entry +c','c'],['crystalWallRecoveryMinProfitNetPerOriginalContractCents','Min profit target','c'],['crystalWallRecoveryAuroraDamageControlPercent','Aurora %','%']],desc:'CW1 capital recovery of verified Great Horn losses; separate durable parent, seats, Link, max spread, Aurora, X1/Infinity, Multiply, P/L and closed-trade accounting. Existing Great Horn behavior unchanged. New CW1 LIVE buys are independently release-gated.'},
  {legacy:'Lightning Plasma',name:'Lightning Plasma',key:'lightningPlasmaEnabled',x1:'lightningPlasmaAthenaX1Enabled',stake:'lightningPlasmaFieldStakeCents',min:'lightningPlasmaMinEntryCents',max:'lightningPlasmaMaxEntryCents',multiply:'lightningPlasmaMultiply',fields:[['lightningPlasmaStarlightScaleInCents','Starlight +c to enter','c'],['lightningPlasmaMinCrashCents','Min crash','c'],['lightningPlasmaMinReboundCents','Min rebound','c'],['lightningPlasmaMinUpwardTicks','Upward ticks',''],['lightningPlasmaObservationMinutes','Observe','min'],['lightningPlasmaMinProfitNetPerOriginalContractCents','Min profit target','c'],['lightningPlasmaAuroraDamageControlPercent','Aurora %','%']],repeats:'lightningPlasmaMaxRepeats',rays:'lightningPlasmaMaxStrikes',desc:'Only new capital attack. Follows verified virtual Starlight on the same market at its own profit trigger, including after a confirmed profitable Starlight close. Original Starlight entry price stays the reference. A loss, break-even or safety close ends further monitoring for that parent. Own price band, Multiply, Aurora and exits remain authoritative.'},
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
  else if(/MinCrashCents$|MinReboundCents$/.test(key)){minimum=0;maximum=99;}
  else if(/MinUpwardTicks$/.test(key)){minimum=0;maximum=20;}
  else if(/MinEntryCents$|MaxEntryCents$|MinPriceCents$|MaxPriceCents$/.test(key)){minimum=1;maximum=99;}
  else if(/StakeCents$/.test(key)){minimum=0.01;step='any';}
  if(key==='lightningPlasmaStarlightScaleInCents'){minimum=0;maximum=50;title='Rise above the ORIGINAL virtual Starlight entry. 0 disables capital continuation.';}
  if(key==='athenaExclamationStarlightTriggerCents'){minimum=0;maximum=99;title='Rise above original Athena entry after a verified shadow loss. 0 preserves the previous Starlight route.';}
  return `<label>${esc(label)}<span><input data-setting-key="${esc(key)}" type="number" step="${step}"${required?' required':''}${minimum==null?'':` min="${minimum}"`}${maximum==null?'':` max="${maximum}"`}${title?` title="${esc(title)}"`:''} value="${esc(v??'')}"><em>${esc(suffix)}</em></span></label>`;
}
function attackControlsHtml(s,a){let h=inputHtml(a.stake,'Stake',s.settings?.[a.stake],'c',1)+inputHtml(a.min,'Min entry',s.settings?.[a.min],'c',1)+inputHtml(a.max,'Max entry',s.settings?.[a.max],'c',1);for(const [k,l,u] of (a.fields||[]))h+=inputHtml(k,l,s.settings?.[k],u,1,/Min crash|Min rebound|Upward ticks/.test(l)?0:null);if(a.rays)h+=inputHtml(a.rays,'Max rays',s.settings?.[a.rays],'',1);if(a.multiply)h+=inputHtml(a.multiply,'Multiply',s.settings?.[a.multiply],'',1);if(a.repeats)h+=inputHtml(a.repeats,'Max repeats',s.settings?.[a.repeats],'',1);if(a.x1){const on=s.settings?.[a.x1]===true;h+=`<label>Profit model<span><button class="model-toggle ${on?'enabled':'disabled'}" type="button" data-model-key="${esc(a.x1)}" data-model-name="${esc(a.name)} X1" data-enabled="${on}">${on?'ATHENA X1':'INFINITY'}</button></span></label>`;}if(a.legacy==='Great Horn Recovery'){const link=s.settings?.greatHornLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="greatHornLinkEnabled" data-model-name="Great Horn Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Crystal Wall Recovery'){const link=s.settings?.crystalWallRecoveryLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="crystalWallRecoveryLinkEnabled" data-model-name="Crystal Wall Recovery Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}if(a.legacy==='Crash Recovery Hunter'){const link=s.settings?.crashRecoveryHunterLinkEnabled===true;h+=`<label>Link<span><button class="model-toggle ${link?'enabled':'disabled'}" type="button" data-model-key="crashRecoveryHunterLinkEnabled" data-model-name="Starlight Link" data-enabled="${link}">${link?'LINK ON':'LINK OFF'}</button></span></label>`;}let authority=a.legacy==='Crash Recovery Hunter'?'Stop-loss recovery · own Aurora % · Link ON evaluates fresh executable liquidity at or below the verified shadow stop, inside its own band · Link OFF waits for the card':'Strategic qualification: ATHENA ONLY · optional crash/rebound/ticks · X1 or Infinity';if(a.legacy==='Great Horn Recovery')authority='GH1 RELEASE CANDIDATE — NOT DEPLOYMENT CERTIFIED: Link ON immediately evaluates after a verified Lightning loss and bypasses Observe, crash, rebound, ticks, Lightning +c, the Great Horn operator entry band and the old exit-price ceiling; financial book, liquidity, spread and capital checks are ALWAYS enforced. Link OFF follows the full configured recovery card. Durable SIM entry and guarded LIVE pending-order/exit code. LIVE orders fail closed unless the native infrastructure release gate is explicitly verified. Operator must not run unverified capital execution; existing positions retain protection. Historical Momentum Hunter identity is preserved.';if(a.legacy==='Crystal Wall Recovery')authority='CW1 SECOND-LEVEL RECOVERY: A financially verified CLOSED losing Great Horn capital parent arms an independent Crystal Wall Recovery watch. Link ON bypasses recovery-pattern and operator-price-band checks, never spread/depth/fees/capital protections. Link OFF follows its own configured card. No recursive recovery. New LIVE BUYs are fail-closed by an independent release gate.';if(a.legacy==='Scarlet Needle')authority='Strategic qualification: ATHENA ONLY · Cosmo GREEN → Bolt → FIRE · optional crash/rebound/ticks · X1 or Infinity';if(a.legacy==='Lightning Plasma')authority='Capital continuation on a verified virtual Starlight parent, OPEN or CLOSED with verified net profit; ORIGINAL entry remains the threshold reference · own stake/band/profit/Aurora % · Multiply seats · LP loss never arms Starlight · no follow-up';if(a.legacy==='Athena Exclamation'||a.legacy==='Sagittarius Justice Arrow')authority='Independent CI1 crash-rebound · own crash/rebound/ticks · X1 or Infinity · Aurora';if(a.legacy==='Crash Recovery Hunter'&&Number(s.settings?.athenaExclamationStarlightTriggerCents||0)>0)authority='Stop-loss recovery | Athena: wait for the trigger above ORIGINAL entry, then use Starlight own live entry band and Aurora. Verified stop must still pass the band filter. Link OFF also requires existing crash/rebound/ticks.';if(a.legacy==='Crash Recovery Hunter')authority+=` | Athena +c to enter: ${Number(s.settings?.athenaExclamationStarlightTriggerCents||0)}c (edit and Save here on Starlight; 0 = original behavior). After a VERIFIED Athena shadow loss, compare current bid to ORIGINAL Athena entry. With a positive trigger use Starlight own live entry band, not the old stop-price ceiling. Other parents unchanged.`;if(a.legacy==='Crash Recovery Hunter'||a.legacy==='Lightning Plasma')authority+=' | X1 uses this card minimum profit; INFINITY uses the shared Infinity Break target.';if(a.legacy==='Lightning Plasma')authority+=' | Crash/rebound/ticks/Observe and Max rays/repeats configure ordinary virtual Lightning signals, not capital Starlight continuation. Capital continuation uses Starlight +c and its own entry/protection gates.';if(a.legacy==='Recovery Hunter')authority='Independent CI1 crash-rebound · own crash/rebound/ticks · X1 or Infinity · Aurora';return `<div class="model-settings">${h}<button class="btn light model-save" data-model-save="${esc(a.legacy)}">Save</button></div><div class="attack-authority-note">${authority}</div>`;}
function cosmoControlsHtml(s,c){const fields=c.fields||[];const controls=fields.length?`<div class="model-settings">${fields.map(([k,l,u])=>inputHtml(k,l,s.settings?.[k],u,1)).join('')}<button class="btn light model-save" data-model-save="${esc(c.name)}">Save</button></div>`:'';const note=c.legacy==='Gemini'?'GEMINI UNIVERSE · ANOTHER DIMENSION ATTACK · no broker order · no real/simulation portfolio capital': 'SHADOW TRADE ONLY · no broker order · no real portfolio capital';return `${controls}<div class="attack-authority-note">${note}</div>`;}
function statFor(s,name){return (s.conceptStats||[]).find(x=>x.name===name)||{};}
function renderSettings(s){const f=$('settingsForm');if(!f)return;f.innerHTML=SHARED.map(([k,l,u])=>{const step=1;const v=drafts.has(k)?drafts.get(k):s.settings?.[k];return `<label>${esc(l)}<input data-setting-key="${esc(k)}" name="${esc(k)}" type="number" step="${step}" value="${esc(v??'')}"><small>${esc(u)}</small></label>`;}).join('');}
// Financial statistics must never share the editing lifecycle of Attack controls.
// Great Horn's source of truth is the same scope-verified capital report used
// by its separate financial panel; its legacy conceptStats row can lag behind.
function attackDisplayMetrics(s,a){
  if(a.legacy==='Great Horn Recovery'){
    const p=verifiedGreatHornPerformance(s);
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
    const p=verifiedCrystalWallRecoveryPerformance(s);
    if(!p.available)return {avg:'Unavailable',entries:'Unavailable',open:'Unavailable',closed:'Unavailable',wl:'Unavailable',rate:'Unavailable',pnl:'Unavailable',pnlClass:'muted'};
    return {avg:numericReportValue(p.avgEntryCents)?pc(p.avgEntryCents):'Unavailable',
      entries:numericReportValue(p.total)?String(p.total):'Unavailable',
      open:String(p.open),closed:String(p.closed),wl:`${p.wins} / ${p.losses}`,
      rate:pct01(Number(p.closed)>0?Number(p.wins)/Number(p.closed):0),
      pnl:financialMoney(p.realizedCents),pnlClass:pnlClass(p.realizedCents)};
  }
  const st=statFor(s,a.legacy);
  return {avg:pc(st.avgEntryCents),entries:String(st.total||0),open:String(st.open||0),
    closed:String(st.closed||0),wl:`${st.wins||0}/${st.losses||0}`,
    rate:pct01(st.winRate),pnl:money(st.pnlCents),pnlClass:pnlClass(st.pnlCents)};
}
const ATTACK_METRIC_KEYS=['avg','entries','open','closed','wl','rate','pnl'];
function renderAttacks(s){
  const b=$('attackBody');if(!b)return;
  b.innerHTML=ATTACKS.map((a,i)=>{
    const enabled=s.settings?.[a.key]===true,m=attackDisplayMetrics(s,a);
    const cells=ATTACK_METRIC_KEYS.map(key=>`<td data-attack-metric="${key}"${key==='pnl'?` class="${esc(m.pnlClass)}"`:''}>${esc(m[key])}</td>`).join('');
    return `<tr data-attack-index="${i}" class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(a.name)}</div><div class="legacy-name">${a.legacy==='Lightning Plasma'?'CAPITAL continuation':a.legacy==='Great Horn Recovery'||a.legacy==='Crystal Wall Recovery'?'CAPITAL RECOVERY / RELEASE GATED':'VIRTUAL signal only'} | ${esc(a.legacy)}</div><div class="concept-desc">${esc(a.desc)}</div>${attackControlsHtml(s,a)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(a.key)}" data-model-name="${esc(a.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td>${cells}</tr>`;
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
  }
}
function renderCosmos(s){const b=$('cosmoBody');if(!b)return;b.innerHTML=COSMOS.map((c,i)=>{const st=c.legacy==='Gemini'?(s.gemini||{}):statFor(s,c.legacy),enabled=s.settings?.[c.key]===true;const shadowTrades=c.legacy==='Gemini'?(st.total??0):(st.feederSignals??st.total??0);const open=st.open||0;const fed=c.legacy==='Gemini'?'-':(st.fedHunters??0);const pnl=c.legacy==='Gemini'?(st.pnlCents??0):st.pnlCents;return `<tr class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(c.name)}</div><div class="concept-desc">${esc(c.desc||'Reference intelligence for Atomic Thunder Bolt and Athena.')}</div>${cosmoControlsHtml(s,c)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(c.key)}" data-model-name="${esc(c.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td><td>${shadowTrades}</td><td>${open}</td><td>${pc(st.avgEntryCents)}</td><td>${pc(st.avgCurrentCents)}</td><td>${fed}</td><td class="${pnlClass(pnl)}">${money(pnl)}</td></tr>`;}).join('');}

function renderBolt(s){const b=s.atomicThunderBolt||{},e=b.episodes||{},g=b.greenTrigger||{},pg=b.patternGuardian||{},f=s.entryCandidateFunnel||{},bs=f.byStage||{},dd=f.dedup||{};setText('boltStatus',b.version||'ATOMIC-THUNDER-BOLT-V2');$('boltStatus').className='pill green';setText('boltTotal',e.total??b.detected??0);setText('boltFire',e.fire??0);setText('boltWatch',e.watch??0);setText('boltReject',e.reject??0);setText('boltExpired',e.expired??0);setText('boltClean',e.clean??0);setText('boltToxic',e.toxicLate??0);setText('boltFalse',e.falseBolt??0);renderSettingInput('atomicThunderGreenTrigger','atomicThunderGreenTriggerCents',s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1);setText('atomicThunderPatternNote',`COSMO_GREEN: executable bid must move +${Number(s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1)}c from the shadow entry. ${g.boltedShadowTrades||0} shadow trades have emitted a Bolt. One Bolt per shadow trade. Legacy ${pg.version||'ATB2'} is ${pg.authority||'RESEARCH_ONLY'} and cannot veto or delay.`);setText('entryCandidateFunnelNote',`${f.version||'ECF1'} chain: ${f.uniqueCandidates||0} candidates → ${bs.COSMO_GREEN||0} GREEN → ${bs.BOLT||0} Bolt → ${bs.ATHENA_FIRE||0} FIRE → ${bs.EXECUTION_ELIGIBLE||0} execution eligible → ${bs.OPENED||0} opened. Dedup: ${dd.athenaUnchangedSuppressed||0} unchanged Athena callbacks suppressed, ${dd.athenaChangedStateRetries||0} changed-state retries, ${dd.scarletUnchangedSuppressed||0} unchanged Needle triggers suppressed.`);const r=$('opportunityResearch');if(r)r.textContent=`Historical opportunity research remains telemetry only. Complete episodes: ${e.complete||0} · CLEAN ${e.clean||0} · TOXIC/LATE ${e.toxicLate||0} · FALSE ${e.falseBolt||0}. It has no authority over COSMO_GREEN → Bolt.`;}
function renderAthena(s){const a=s.athena||{},m=a.memory||{},d=a.lastDecision||null,b=d?.ranking?.[0]||null,target=d?.configuredTargetNetPerOriginalContractCents??s.settings?.infinityBreakMinNetPerOriginalContractCents;setText('athenaStatus',a.version||'ATHENA-A3');$('athenaStatus').className=`pill ${a.loadedAtMs?'green':'amber'}`;setText('arayashikiStatus','DIRECT');setText('athenaSurvivalCertified','OFF');setText('athenaSurvivalRejected','RANKING');setText('athenaTarget',target==null?'-':`${pc(target)} net / original contract`);setText('athenaEntries',m.entryRows||0);setText('athenaEpisodes',m.opportunityRows||0);setText('athenaProfitEpisodes',m.profitEpisodeRows||0);setText('athenaProfiles',m.profileCount||0);setText('athenaDecisions',a.decisions||0);setText('athenaFire',a.fire||0);setText('athenaWatch',a.watch||0);setText('athenaReject',a.reject||0);setText('athenaExpired',a.expired||0);setText('athenaLastEV',b?.expectedNetPerOriginalContractCents==null?'-':`${dpc(b.expectedNetPerOriginalContractCents)} / contract`);setText('athenaLastTargetProb',pct01(b?.targetHitProbability));const green=d?.fireCommand?.decisionEvidence?.greenTrigger||null;setText('athenaLast',d?`${d.decision} · ${d.selectedAttackDisplay||d.selectedAttack||'-'} · ${d.reason||'-'} · target ${pc(d.configuredTargetNetPerOriginalContractCents??target)} · ranked EV ${b?.expectedNetPerOriginalContractCents==null?'-':dpc(b.expectedNetPerOriginalContractCents)} · P(target) ${pct01(b?.targetHitProbability)} · Cosmos ${green?.cosmo||'-'} ${green?.moveCents==null?'':dpc(green.moveCents)} · Bolt ${d.boltId||'-'} · Needle armed ${a.scarletNeedle?.armed||0}`:`No Athena decision yet. · Needle armed ${a.scarletNeedle?.armed||0}`);}
function renderInfinity(s){const x=s.infinityBreak||{};setText('infinityStatus',x.version||'INFINITY-BREAK-V1');$('infinityStatus').className='pill green';for(const [id,key] of [['infinityMinNet','infinityBreakMinNetPerOriginalContractCents'],['infinityConfirmations','infinityBreakRequiredConfirmations'],['infinityBookAge','infinityBreakMaximumBookAgeMs'],['infinityWindow','infinityBreakConfirmationWindowMs']]){renderSettingInput(id,key,s.settings?.[key]??'');}setText('infinityObserved',x.positionsObserved||0);setText('infinityActive',x.activePositions||0);setText('infinityBreaks',x.breaksExecuted||0);setPnl('infinityRealized',x.realizedPnlCents);setPnl('infinityAverage',x.averageProfitCents);setText('infinityTime',duration(x.averageTimeToBreakMs));}
function renderAurora(s){const a=s.auroraExecution||{};setText('auroraStatus',a.version||'AURORA-V2');$('auroraStatus').className='pill green';renderSettingInput('auroraDamagePercent','auroraDamageControlPercent',s.settings?.auroraDamageControlPercent??a.damageControlPercent??45);setText('auroraProtected',a.protectedHunters||0);setText('auroraActive',a.activeAuroraPositions||0);setText('auroraExits',a.auroraExits||0);setText('auroraAverageStop',pc(a.averageAuroraStopCents));setText('auroraAveragePct',a.averageEconomicLossRatio==null?'-':`${(Number(a.averageEconomicLossRatio)*100).toFixed(1)}%`);setPnl('auroraRealized',a.realizedAuroraPnlCents);setPnl('auroraAverageLoss',a.averageAuroraLossCents);setText('auroraRecovered',a.recoveredAfterAuroraExit||0);}
// CT-H1: history-only operator view. No trading authority, broker commands,
// settings writes, financial aggregation or SSE state payload expansion.
const CAPITAL_HISTORY_VERSION='CAPITAL-TRADE-HISTORY-V1';
const CAPITAL_HISTORY_PAGE_SIZE=100;
const CAPITAL_HISTORY_ROW_HEIGHT=44;
const CAPITAL_HISTORY_OVERSCAN=18;
function capitalHistoryEmpty(){return {rows:[],ids:new Set(),cursor:null,cutoff:null,hasMore:true,
  loading:false,controller:null,generation:0,scope:'',lastFetchedAt:0,error:''};}
const capitalHistory={open:capitalHistoryEmpty(),closed:capitalHistoryEmpty()};
let capitalHistoryScope='';
function capitalHistoryKey(s){const x=s?.settings;
  return x&&x.systemName&&x.ownerId&&['SIMULATION','LIVE'].includes(x.mode)
    &&Number.isSafeInteger(Number(x.resetTimestampMs||0))
    ?JSON.stringify([String(x.systemName),String(x.ownerId),String(x.mode),Number(x.resetTimestampMs||0)]):'';
}
function capitalHistoryIds(kind){return kind==='open'
  ?{body:'openHunterBody',scroll:'openCapitalScroll',count:'openHunterCount',status:'openCapitalHistoryStatus',older:'openCapitalOlderBtn',refresh:'openCapitalRefreshBtn'}
  :{body:'closedBody',scroll:'closedCapitalScroll',count:'closedCount',status:'closedCapitalHistoryStatus',older:'closedCapitalOlderBtn',refresh:'closedCapitalRefreshBtn'};}
function capitalHistoryVisible(kind){return kind==='open'||!!$('closedPositionsFold')?.open;}
function capitalHistoryDate(v){return Number(v)>0&&Number.isFinite(Number(v))?new Date(Number(v)).toLocaleString():'-';}
function capitalHistoryOpenRow(e){
  const danger=e.aurora?.dangerPriceCents??e.aurora?.dangerLineCents;
  const control=e.aurora?`${Number(e.aurora.damageControlPercent??(Number(e.aurora.maximumEconomicLossRatio||0)*100)).toFixed(1)}% / ${pc(danger)}`:'-';
  const profit=e.entryConfig?.profitAuthority||e.entryConfig?.infinityBreak?.version||'-';
  // Great Horn receives no new operator action or changed exit path. The
  // pre-existing Lightning emergency exit button alone is retained.
  const action=e.conceptName==='Lightning Plasma'
    ?`<button class="btn emergency-exit" data-emergency-entry="${esc(e.id)}" data-emergency-name="${esc(e.executionAttackName||e.conceptName)}">Emergency Exit</button>`:'-';
  return `<tr class="capital-entry-row"><td class="ticker">${esc(e.ticker)}</td><td class="capital-attack-name">${esc(e.conceptName)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentPriceCents)}</td><td>${pc(e.peakPriceCents)}</td><td>${control}</td><td>${esc(profit)}</td><td>${e.positionExposureConfirmed===false?'Unconfirmed':esc(e.remainingCount??e.count??0)}</td><td>${esc(e.status)}</td><td class="${pnlClass(e.positionPnlCents)}">${e.positionExposureConfirmed===false?'Pending fill':financialMoney(e.positionPnlCents)}</td><td>${action}</td></tr>`;
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
  return `<tr class="capital-entry-row"><td class="ticker">${esc(e.ticker)}</td><td class="capital-attack-name">${esc(e.conceptName)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${pc(post)}</td><td class="${pnlClass(delta)}">${dpc(delta)}</td><td>${best==null?'-':`${pc(best)} (${dpc(bestDelta)})`}</td><td class="${pnlClass(missed)}">${missed==null?'-':money(missed)}</td><td>${worst==null?'-':`${pc(worst)} (${dpc(worstDelta)})`}</td><td class="${pnlClass(saved)}">${saved==null?'-':money(saved)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td><td>${capitalHistoryDate(e.openedAtMs)}</td><td>${capitalHistoryDate(e.closedAtMs)}</td></tr>`;
}
function renderCapitalViewport(kind){
  if(!capitalHistoryVisible(kind))return;
  const h=capitalHistory[kind],ids=capitalHistoryIds(kind),pane=$(ids.scroll),body=$(ids.body);
  if(!pane||!body)return;
  const total=h.rows.length;
  if(!total){body.innerHTML=`<tr><td colspan="${kind==='open'?11:14}" class="muted">${h.loading?'Loading capital trades...':h.error?'Trade history unavailable.':'No current-scope capital trades.'}</td></tr>`;return;}
  const start=Math.max(0,Math.floor(pane.scrollTop/CAPITAL_HISTORY_ROW_HEIGHT)-CAPITAL_HISTORY_OVERSCAN);
  const windowSize=Math.ceil((pane.clientHeight||510)/CAPITAL_HISTORY_ROW_HEIGHT)+2*CAPITAL_HISTORY_OVERSCAN;
  const end=Math.min(total,start+windowSize),colspan=kind==='open'?11:14;
  const spacer=(count)=>count>0?`<tr class="capital-spacer-row" aria-hidden="true"><td colspan="${colspan}" style="height:${count*CAPITAL_HISTORY_ROW_HEIGHT}px"></td></tr>`:'';
  body.innerHTML=spacer(start)+h.rows.slice(start,end).map(kind==='open'?capitalHistoryOpenRow:capitalHistoryClosedRow).join('')+spacer(total-end);
}
function renderCapitalHistoryStatus(kind,s){
  const h=capitalHistory[kind],ids=capitalHistoryIds(kind),p=lightningPerformance(s),g=verifiedGreatHornPerformance(s),w=verifiedCrystalWallRecoveryPerformance(s);
  const verified=p.available===true&&g.available===true&&w.available===true;
  const n=verified&&[p,g,w].every(r=>numericReportValue(r[kind]))
    ?Number(p[kind])+Number(g[kind])+Number(w[kind]):null;
  setText(ids.count,n===null?'(total unavailable)':`(${n.toLocaleString()} total)`);
  if(kind==='open')setText('hunterSummary',verified
    ?`${p.open} Lightning Plasma + ${g.open} Great Horn + ${w.open} Crystal Wall capital positions · historical entries load on scroll.`
    :'Capital-only trade rows. Financial report totals unavailable until both reporting contracts verify.');
  const count=h.rows.length,summary=`${count.toLocaleString()} loaded${n===null?'':` of ${n.toLocaleString()}`}`;
  setText(ids.status,!capitalHistoryVisible(kind)&&!h.lastFetchedAt
    ?'Expand to load current-scope trade history.'
    :h.error?`${summary}. ${h.error} No fresh trade-list snapshot is asserted.`
    :h.loading?`${summary}. Loading ${count?'older':'current'} records...`
    :`${summary}${h.hasMore?' · Scroll down for older records.':' · End of available history.'}${h.lastFetchedAt?' · Last fetched '+new Date(h.lastFetchedAt).toLocaleTimeString():''}`);
  if($(ids.older))$(ids.older).disabled=h.loading||!h.hasMore||!h.scope||!capitalHistoryVisible(kind);
  if($(ids.refresh))$(ids.refresh).disabled=h.loading||!h.scope||!capitalHistoryVisible(kind);
}
function clearCapitalHistory(kind,scope){
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
    if(!e||!e.id||!['Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery'].includes(e.conceptName)
      ||!dashboardRowScopeMatches(e,s.settings)
      ||e.executionClass==='SHADOW_SAINT'||e.entryConfig?.executionClass==='SHADOW_SAINT')return false;
    if(kind==='closed')return e.status==='closed'&&Number(e.count)>0;
    return ['open','exit_pending','entry_pending','pending_recovery'].includes(e.status)
      &&Number(e.remainingCount)>0&&e.positionExposureConfirmed===true;
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
    h.cursor=page.nextCursor;h.hasMore=page.hasMore;h.lastFetchedAt=Date.now();
    if(h.hasMore&&!h.cursor)throw new Error('History cursor missing while more pages are advertised');
    renderCapitalViewport(kind);
  }catch(error){
    if(h!==capitalHistory[kind]||generation!==h.generation||scope!==capitalHistoryScope||error.name==='AbortError')return;
    h.error=String(error?.message||error);console.error('Capital trade history:',h.error);
  }finally{
    if(h===capitalHistory[kind]&&generation===h.generation){h.loading=false;h.controller=null;if(STATE)renderCapitalHistoryStatus(kind,STATE);renderCapitalViewport(kind);}
  }
}
function syncCapitalHistory(s){
  const scope=capitalHistoryKey(s);
  if(scope!==capitalHistoryScope){capitalHistoryScope=scope;
    for(const kind of ['open','closed'])clearCapitalHistory(kind,scope);
  }
  for(const kind of ['open','closed']){
    renderCapitalHistoryStatus(kind,s);
    if(scope&&capitalHistoryVisible(kind)&&!capitalHistory[kind].loading&&capitalHistory[kind].lastFetchedAt===0&&!capitalHistory[kind].error)
      void loadCapitalHistoryPage(kind);
  }
}
function capitalHistoryAutoRefresh(){
  if(!STATE||modeChangePending)return;
  for(const kind of ['open','closed']){
    const h=capitalHistory[kind],pane=$(capitalHistoryIds(kind).scroll);
    if(!capitalHistoryVisible(kind)||!pane||h.loading||h.error||!h.lastFetchedAt||Date.now()-h.lastFetchedAt<30000)continue;
    // Never disrupt an operator reviewing older historical trades.
    if(pane.scrollTop<60)void loadCapitalHistoryPage(kind,{refresh:true});
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
  setInterval(capitalHistoryAutoRefresh,15000);
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

function renderSystem(s){const p=lightningPerformance(s),account=actualAccountBalances(s),h=s.health||{},r=s.resourceUsage||{};const live=s.settings?.mode==='LIVE'&&s.settings?.liveArmed===true,disarmedLive=s.settings?.mode==='LIVE'&&!live;setText('portfolioLabel',disarmedLive?'LIVE selected, not armed':live?'Kalshi Account Portfolio':'SIM Account Value');setText('cashLabel',disarmedLive?'LIVE disarmed — cash unavailable':live?'Kalshi Account Cash':'SIM Account Free Cash');if(disarmedLive){setText('portfolioValue','Unavailable');setText('simFreeCash','Unavailable');}else if(live){if(account.kalshiPortfolioCents==null)setText('portfolioValue','Unavailable');else setFinancialPnl('portfolioValue',account.kalshiPortfolioCents,true);if(account.kalshiCashCents==null)setText('simFreeCash','Unavailable');else setFinancialPnl('simFreeCash',account.kalshiCashCents,true);}else{setFinancialPnl('portfolioValue',account.portfolioValueCents,true);setFinancialPnl('simFreeCash',account.simulationCashCents,true);}const gaps=s.brokerLedgerGaps||{};const untracked=gaps.untracked||[];setText('brokerBookNote',s.settings?.mode==='LIVE'?`Kalshi contracts ${gaps.brokerContracts||0} · ledger ${gaps.ledgerContracts||0} · ignored other system ${untracked.length}${untracked.length?': '+untracked.map(x=>`${x.ticker} +${x.ignored??x.untracked}`).join(', '):''}`:'');setText('winRate',p.available===false?'Unavailable':pct01(p.winRate));setFinancialPnl('unrealized',p.unrealizedCents);setFinancialPnl('realized',p.realizedCents);setFinancialPnl('profitToday',p.dayRealizedCents);setFinancialPnl('profitWeek',p.weekRealizedCents);setFinancialPnl('profitMonth',p.monthRealizedCents);setFinancialPnl('profitYear',p.yearRealizedCents);setText('openCount',p.open??'Unavailable');renderExecutionFinancialDetail(p);renderGreatHornFinancialDetail(s);renderCrystalWallFinancialDetail(s);renderCapitalCombined(s);setText('closedPerfCount',p.closed??'Unavailable');setText('releaseLabel',s.build?.id||s.release||s.settings?.release||'R60-COSMO-GREEN');setText('modeBtn',s.settings?.mode||'SIMULATION');$('modeBtn').className=`btn ${s.settings?.mode==='LIVE'?'danger':'light'}`;setText('modeNote',windowModeArmDenial?'LIVE activation refused: '+windowModeArmDenial:(s.settings?.mode==='LIVE'?(s.settings?.liveArmed?'LIVE armed':'LIVE selected, disarmed — entries blocked'):'Paper trading - no real orders.'));setText('modeBtn',s.settings?.mode==='LIVE'&&s.settings?.liveArmed?'SIMULATION':'ARM LIVE');setText('engineBtn',s.settings?.engineActive?'Stop Engine':'Start Engine');setText('engineStatus',s.settings?.engineActive?'Engine running':'Engine stopped');$('engineStatus').className=`pill ${s.settings?.engineActive?'green':'red'}`;setText('systemStatus',h.degraded?'DEGRADED':'HEALTHY');$('systemStatus').className=`pill ${h.degraded?'red':'green'}`;setText('uptime',duration(Date.now()-Number(h.startedAtMs||Date.now())));const errors=(s.audit||[]).filter(x=>x.level==='error');$('errorWatchdog').classList.toggle('hidden',!errors.length);if(errors.length)$('errorWatchdog').textContent=`Error Watchdog — ${errors.length} recent errors · ${errors[0].event}: ${errors[0].data?.message||''}`;const scan=s.scanner||{};const scanFresh=Number(scan.lastScanMs||0)>0&&Date.now()-Number(scan.lastScanMs)<10*60*1000;setText('entryRunning',scanFresh?'Running':'Waiting');$('entryRunning').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerActive',scanFresh?'ACTIVE':'WAITING');$('scannerActive').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerDetail',`Tracked ${scan.tracked||0} · active markets ${scan.activeMarkets||0} · last scan ${scan.lastScanMs?duration(Date.now()-scan.lastScanMs)+' ago':'never'}`);const resourceState=r.pressureState||r.status||'UNKNOWN';setText('resourceStatus',resourceState);$('resourceStatus').className=`pill ${['NORMAL','GREEN'].includes(resourceState)?'green':['WATCH','COMPACT','PRESSURE'].includes(resourceState)?'amber':'red'}`;setText('resourceRss',mib(r.memory?.rssBytes??r.rssBytes));setText('resourceHeapUsed',mib(r.memory?.heapUsedBytes??r.heapUsedBytes));setText('resourceCpu',Number.isFinite(Number(r.cpuPercent))?`${Number(r.cpuPercent).toFixed(1)}%`:'-');setText('resourceUptime',duration((r.uptimeSeconds??r.processUptimeSeconds??0)*1000));setText('connectionPill',h.restOk&&h.websocketFresh?'Connected':'Connection check');$('connectionPill').className=`pill ${h.restOk&&h.websocketFresh?'green':'amber'}`;renderSettingInput('systemNameInput','systemName',s.settings?.systemName||'SAGITTARIUS');const andOn=s.settings?.andromedaThunderWaveEnabled===true;const andLevel=String(s.settings?.andromedaThunderWaveLevel||'HIGH').toUpperCase();if($('andromedaStatus')){$('andromedaStatus').textContent=andOn?`ON ${andLevel}`:'OFF';$('andromedaStatus').className=`pill ${andOn?'amber':'red'}`;}if($('andromedaThunderWaveToggle')){$('andromedaThunderWaveToggle').textContent=andOn?'ON':'OFF';$('andromedaThunderWaveToggle').className=`galactic-toggle ${andOn?'on':''}`;}if($('andromedaThunderWaveLevel')&&document.activeElement!==$('andromedaThunderWaveLevel'))$('andromedaThunderWaveLevel').value=['HIGH','MID','LOW','OPEN'].includes(andLevel)?andLevel:'HIGH';}
function renderFreezingCoffin(s){const on=s.settings?.freezingCoffinEnabled===true;setText('freezingCoffinStatus',on?'ON':'OFF');$('freezingCoffinStatus').className=`pill ${on?'amber':'red'}`;const b=$('freezingCoffinToggle');if(b){b.textContent=on?'ON':'OFF';b.dataset.enabled=String(on);b.className=`galactic-toggle ${on?'enabled':'disabled'}`;}renderSettingInput('freezingCoffinDrop','freezingCoffinMaxDropCents',s.settings?.freezingCoffinMaxDropCents??3);}
function renderGalactic(s){const on=s.settings?.galacticExplosionEnabled===true;setText('galacticStatus',on?'ON':'OFF');$('galacticStatus').className=`pill ${on?'amber':'red'}`;const b=$('galacticExplosionToggle');b.textContent=on?'ON':'OFF';b.dataset.enabled=String(on);b.className=`galactic-toggle ${on?'enabled':'disabled'}`;}
function controlFingerprint(s){try{return JSON.stringify({settings:s.settings||{},conceptStats:s.conceptStats||[],gemini:s.gemini||{}});}catch{return String(Date.now());}}
// Keep the editable control DOM stable while typing; financial boards still refresh.
// The fingerprint stays pending, so the next unfocused render applies fresh controls.
function attackControlsFingerprint(s){try{return JSON.stringify(s.settings||{});}catch{return String(Date.now());}}
function render(s){
  if(bootRetryTimer!==null){clearTimeout(bootRetryTimer);bootRetryTimer=null;}
  if(!STATE){for(const id of ['modeBtn','engineBtn','scanBtn','modelScanBtn'])if($(id))$(id).disabled=false;}
  STATE=s;renderSystem(s);renderBolt(s);renderAthena(s);renderInfinity(s);renderAurora(s);renderTrades(s);
  const editing=!!document.activeElement?.matches('[data-setting-key]');
  // Rebuild the control-bearing rows only for actual settings changes, and
  // never while the operator is typing; state/statistics changes cannot steal focus.
  const attackFp=attackControlsFingerprint(s);
  if(!editing&&(attackFp!==ATTACK_CONTROL_FINGERPRINT||!$('attackBody')?.firstElementChild)){
    renderAttacks(s);ATTACK_CONTROL_FINGERPRINT=attackFp;
  }
  // Always update report cells, even if a settings field has keyboard focus.
  renderAttackMetrics(s);
  const fp=controlFingerprint(s);
  if(fp!==CONTROL_FINGERPRINT&&!editing){
    CONTROL_FINGERPRINT=fp;renderSettings(s);renderCosmos(s);renderGalactic(s);renderFreezingCoffin(s);
  }
  syncOperatorUpdates(s);
}
function invalidateStateReads(){
  stateReadEpoch++;stateReadSequence++;pendingRenderState=null;
}
function scheduleRender(s,epoch=stateReadEpoch){
  if(epoch!==stateReadEpoch||modeChangePending)return;
  pendingRenderState={state:s,epoch,sequence:++stateReadSequence};
  if(renderFrame)return;
  const flush=()=>{renderFrame=0;const latest=pendingRenderState;pendingRenderState=null;
    if(latest&&latest.epoch===stateReadEpoch&&latest.sequence===stateReadSequence&&!modeChangePending)render(latest.state);};
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
async function load(allowLogin=false){
  const sequence=++stateReadSequence,epoch=stateReadEpoch;
  try{
    const r=await operatorFetch('/api/state',{cache:'no-store'},allowLogin);const j=await r.json();
    if(sequence!==stateReadSequence||epoch!==stateReadEpoch||modeChangePending)return null;
    if(!r.ok&&j.error==='engine_booting'){renderStartupStatus(j.boot||{});retryStartupRead(epoch);return null;}
    if(!r.ok)throw new Error(j.error||'State unavailable');
    render(j);return j;
  }catch(e){
    if(sequence!==stateReadSequence||epoch!==stateReadEpoch||modeChangePending)return null;
    console.error(e);markFinancialSnapshotUnavailable(`Financial snapshot unavailable: ${e.message}.`);msg(e.message,true);
    if(!STATE){renderStartupStatus({lastErrorMessage:'Waiting for the engine connection. Retrying automatically.'});retryStartupRead(epoch);}return null;
  }
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
$('auroraSave').onclick=async()=>{try{render(await patchSettingsVerified({auroraDamageControlPercent:Number($('auroraDamagePercent').value)}));msg('Aurora Damage Control % saved. New value applies only to future trades; open trades keep their frozen entry percentage.');}catch(e){msg(e.message,true);}};
$('galacticExplosionToggle').onclick=async()=>{const on=$('galacticExplosionToggle').dataset.enabled==='true';if(!on&&!confirm('Enable Galactic Explosion? Every enabled saint that is inside its own price band and confirmation settings may enter the SAME ticker. The one-hunter-per-event cap becomes per-Attack. Crystal Wall and Justice Arrow stay on their own crash path and can also sit on that ticker.'))return;try{render(await patchSettingsVerified({galacticExplosionEnabled:!on}));}catch(e){msg(e.message,true);}};
$('openHunterBody').onclick=async e=>{const b=e.target.closest('[data-emergency-entry]');if(!b)return;if(!confirm(`Emergency exit ${b.dataset.emergencyName||'this Attack'}?`))return;b.disabled=true;try{const r=await post('/api/emergency-exit',{entryId:b.dataset.emergencyEntry});await load();msg(r.closed?'Emergency Exit completed.':r.pending?'Emergency Exit committed; reconciliation pending.':`Not executed: ${r.skipped||r.reason||'unknown'}`,!r.closed&&!r.pending);}catch(x){msg(x.message,true);}finally{b.disabled=false;}};
// Legacy real positions remain controllable outside the current Lightning board.
$('legacyRealExposureBody').onclick=$('openHunterBody').onclick;
$('modeBtn').onclick=async()=>{
  const button=$('modeBtn');if(button.disabled)return;button.disabled=true;
  let attempted=false,acknowledged=false;
  try{
    const live=STATE.settings.mode==='LIVE',armed=STATE.settings.liveArmed===true;
    const target=live&&armed?'SIMULATION':'LIVE';
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
      setText('modeBtn',target==='LIVE'?'SIMULATION':'ARM LIVE');
      setText('modeNote',target==='LIVE'?'LIVE armed; financial snapshot unavailable':'Paper mode committed; financial snapshot unavailable');
    }
  }catch(e){
    windowModeArmDenial=String(e.message||e);setText('modeNote','LIVE activation refused: '+windowModeArmDenial);msg(windowModeArmDenial,true);
  }finally{
    modeChangePending=false;button.disabled=false;
    if(attempted){syncOperatorUpdates(STATE);if(!acknowledged)void load();}
  }
};
$('engineBtn').onclick=async()=>{try{await post('/api/engine',{active:!STATE.settings.engineActive});await load();}catch(e){msg(e.message,true);}};
const scan=async()=>{try{await post('/api/run-scan');msg('Scan requested.');}catch(e){msg(e.message,true);}};$('scanBtn').onclick=scan;$('modelScanBtn').onclick=scan;
$('resetDefaultsBtn').onclick=async()=>{if(!confirm('Reset all operator settings to factory defaults? Open trades stay. This does not wipe learning.'))return;try{await post('/api/reset-defaults');await load();msg('Settings restored to factory defaults.');}catch(e){msg(e.message,true);}};
$('resetDashboardBtn').onclick=async()=>{if(!confirm('Reset dashboard and stop new entries? Existing positions stay protected. Click Start Engine to trade again.'))return;try{await post('/api/reset-dashboard');await load();}catch(e){msg(e.message,true);}};
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
    stream.onmessage=e=>{if(stream!==operatorEventStream||epoch!==stateReadEpoch||modeChangePending)return;try{scheduleRender(JSON.parse(e.data),epoch);}catch{}};
    stream.onerror=()=>{if(stream!==operatorEventStream||epoch!==stateReadEpoch||modeChangePending)return;setText('executionFinancialStatus','Update stream disconnected. Displayed values are the last received snapshot, not live totals.');};
  }
}
setInterval(clock,1000);clock();void load(true);

$('freezingCoffinToggle').onclick=async()=>{const on=$('freezingCoffinToggle').dataset.enabled==='true';if(!on&&!confirm('Enable Freezing Coffin for future shadow Saint entries? These virtual parents use the saved cent drop. Starlight always keeps its own Aurora. Existing positions retain their frozen protection.'))return;try{render(await patchSettingsVerified({freezingCoffinEnabled:!on}));}catch(e){msg(e.message,true);}};
$('andromedaThunderWaveToggle').onclick=async()=>{const on=$('andromedaThunderWaveToggle').textContent==='ON';try{render(await patchSettingsVerified({andromedaThunderWaveEnabled:!on,andromedaThunderWaveLevel:$('andromedaThunderWaveLevel')?.value||'HIGH'}));}catch(e){msg(e.message,true);}};
$('andromedaThunderWaveLevel').onchange=async()=>{try{render(await patchSettingsVerified({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:$('andromedaThunderWaveLevel').value}));}catch(e){msg(e.message,true);}};

$('freezingCoffinSave').onclick=async()=>{try{render(await patchSettingsVerified({freezingCoffinMaxDropCents:Number($('freezingCoffinDrop').value)}));msg('Freezing Coffin drop saved for future virtual parent entries. Starlight keeps its own Aurora.');}catch(e){msg(e.message,true);}};

// Main financial boards have a final display boundary as well as SQL filtering.
function dashboardRowScopeMatches(e,settings){return !!e&&!e.archived&&['systemName','ownerId','mode'].every(k=>e[k]!=null&&String(e[k])===String(settings?.[k]))
  &&Number(e.openedAtMs)>=Number(settings?.resetTimestampMs||0);}
function isCapitalLightning(e,settings){return e?.conceptName==='Lightning Plasma'
  &&e.executionClass!=='SHADOW_SAINT'&&e.entryConfig?.executionClass!=='SHADOW_SAINT'&&dashboardRowScopeMatches(e,settings);}
let shadowHistoryCursor=null,shadowHistoryPinned=false,shadowHistoryScope='';
function renderLegacyCapitalHistory(s){
  const a=s.legacyCapitalPerformance,valid=a&&financialScopeMatches(a.scope,s.settings);
  const rows=(s.legacyClosedHunters||[]).filter(e=>e.conceptName==='Crash Recovery Hunter'&&e.executionClass!=='SHADOW_SAINT'
    &&e.entryConfig?.executionClass!=='SHADOW_SAINT'&&e.status==='closed'&&Number(e.count)>0&&dashboardRowScopeMatches(e,s.settings));
  $('legacyCapitalHistoryPanel')?.classList.toggle('hidden',!valid||(Number(a.total||0)===0&&Number(a.pending||0)===0));
  setText('legacyCapitalHistoryCount',valid?`(${a.closed||0} closed; ${rows.length} recent rows)`:'');
  setText('legacyCapitalSummary',valid?`Legacy Starlight capital only, excluded from Lightning results. Realized ${financialMoney(a.realizedCents)}; unrealized ${financialMoney(a.unrealizedCents)}. ${a.wins||0} wins / ${a.losses||0} losses. These remain genuine account transactions.`:'Legacy history unavailable.');
  if($('legacyClosedBody'))$('legacyClosedBody').innerHTML=rows.map(e=>`<tr><td class="ticker">${esc(e.ticker)}</td><td>Legacy Starlight capital</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${financialMoney(e.pnlCents)}</td><td>${e.closedAtMs?new Date(e.closedAtMs).toLocaleString():'-'}</td></tr>`).join('')||'<tr><td colspan="7">No legacy closed positions in this scope.</td></tr>';
}
function renderShadowDashboard(s){
  renderLegacyCapitalHistory(s);
  const scope=JSON.stringify([s.settings?.systemName,s.settings?.ownerId,s.settings?.mode,s.settings?.resetTimestampMs]);
  if(scope!==shadowHistoryScope){shadowHistoryScope=scope;shadowHistoryPinned=false;shadowHistoryCursor=null;}
  const d=s.shadowDiagnostics||{},worker=d.worker||{},summary=d.summary||{};
  const age=worker.lastSuccessAtMs?duration(Date.now()-worker.lastSuccessAtMs):'never';
  setText('shadowWorkerStatus',`${d.error||worker.degraded?'DEGRADED':'Virtual worker'} · ${summary.open||0} open · ${summary.closed||0} closed · last successful sweep ${age} · errors ${worker.errors||0} · waits ${worker.waits||0}${worker.lastError?' · '+worker.lastError:''}${summary.unverified_legacy?' · '+summary.unverified_legacy+' unverified old shadow records quarantined':''}`);
  if(!shadowHistoryPinned){renderShadowSaints(s.shadowSaints||[]);shadowHistoryCursor=d.nextCursor||null;}
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
  const params=new URLSearchParams({limit:'100'}),filter=$('shadowStatusFilter')?.value;
  if(filter)params.set('status',filter);
  if(older){if(!shadowHistoryCursor)return;for(const[k,v]of Object.entries(shadowHistoryCursor))params.set(k,String(v));}
  try{const response=await operatorFetch('/api/shadow-saints?'+params,{},true);if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const page=await response.json();shadowHistoryPinned=true;shadowHistoryCursor=page.nextCursor||null;renderShadowSaints(page.rows||[]);
    setText('shadowHistoryMessage',`Virtual history page. ${page.rows?.length||0} records. ${shadowHistoryCursor?'Older records available.':'End of available history.'}`);
  }catch(error){setText('shadowHistoryMessage',`Virtual history unavailable: ${error.message}`);}
}
$('shadowRefreshBtn')?.addEventListener('click',()=>loadShadowHistory(false));
$('shadowOlderBtn')?.addEventListener('click',()=>loadShadowHistory(true));
$('shadowStatusFilter')?.addEventListener('change',()=>loadShadowHistory(false));
