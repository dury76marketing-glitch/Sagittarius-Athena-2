let STATE=null;
let ACTIVE_COSMOS=null;
let COSMOS_VIEW_ID=null;
let COSMOS_VIEW_SETTINGS=null;
let COSMO_FILTER='ALL';
let CONTROL_FINGERPRINT='';
let pendingRenderState=null,renderFrame=0;
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
const post=async(url,data={})=>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j;};
const patch=async(url,data)=>{const r=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j;};
function msg(text,bad=false){const e=$('actionMessage');if(!e)return;e.textContent=text;e.className=`message ${bad?'negative':'positive'}`;setTimeout(()=>{if(e.textContent===text)e.textContent='';},7000);}
function setPnl(id,v,plain=false){const e=$(id);if(!e)return;e.textContent=plain?moneyPlain(v):money(v);e.className=pnlClass(v);}
function setText(id,v){const e=$(id);if(e)e.textContent=v;}

const ATTACKS=[
  {legacy:'Athena Exclamation',name:'Athena Exclamation',key:'athenaExclamationEnabled',stake:'athenaExclamationStakeCents',min:'athenaExclamationMinEntryCents',max:'athenaExclamationMaxEntryCents',pri:'athenaExclamationPri1R2Enabled',fields:[['athenaExclamationPri1R2TriggerCents','PRI1-R2 arm target','c'],['athenaExclamationFollowUpAttacks','Follow-up Attacks (0-12)',''],['athenaExclamationMinCrashCents','Min crash','c'],['athenaExclamationMinReboundCents','Min rebound','c'],['athenaExclamationMinUpwardTicks','Upward ticks','']],desc:'Mega Wave supreme first real continuation Attack after Crystal Wall proofs, then Justice-style crash/rebound/up-tick confirmation.'},
  {legacy:'Scarlet Needle',name:'Scarlet Needle',key:'scarletNeedleEnabled',stake:'scarletNeedleStakeCents',min:'scarletNeedleMinEntryCents',max:'scarletNeedleMaxEntryCents',pri:'scarletNeedlePri1R2Enabled',fields:[['scarletNeedlePri1R2TriggerCents','PRI1-R2 arm target','c'],['scarletNeedleInfinityNetPerOriginalContractCents','Infinity target when PRI OFF','c'],['scarletNeedleMinCrashCents','Min crash','c'],['scarletNeedleMinReboundCents','Min rebound','c'],['scarletNeedleMinUpwardTicks','Upward ticks','']],repeats:'scarletNeedleMaxRepeats',repeatLabel:'Max repeats (0/1)',desc:'Athena-profit downstream Saint using Justice-style crash/rebound/up-tick confirmation.'},
  {legacy:'Sagittarius Justice Arrow',name:'Sagittarius Justice Arrow',key:'justiceArrowEnabled',stake:'justiceArrowStakeCents',min:'justiceArrowMinEntryCents',max:'justiceArrowMaxEntryCents',pri:'justiceArrowPri1R2Enabled',fields:[['justiceArrowPri1R2TriggerCents','PRI1-R2 arm target','c'],['justiceArrowMinCrashCents','Min crash','c'],['justiceArrowMinReboundCents','Min rebound','c'],['justiceArrowMinUpwardTicks','Upward ticks','']],desc:'Athena-profit downstream Saint retaining Justice crash/rebound/up-tick confirmation.'},
  {legacy:'Wave Surfer',name:'Pegasus Ryu Sei Ken',key:'waveSurferEnabled',stake:'waveStakeCents',min:'waveMinEntryCents',max:'waveMaxEntryCents',pri:'wavePri1R2Enabled',fields:[['wavePri1R2TriggerCents','PRI1-R2 arm target','c'],['waveMinCrashCents','Min crash','c'],['waveMinReboundCents','Min rebound','c'],['waveMinUpwardTicks','Upward ticks','']],desc:'Athena-profit downstream Saint using Athena Exclamation crash/rebound/up-tick confirmation.'},
  {legacy:'Crash Recovery Hunter',name:'Starlight Extinction',key:'crashRecoveryHunterEnabled',stake:'crashRecoveryStakeCents',min:'crashRecoveryMinEntryCents',max:'crashRecoveryMaxEntryCents',pri:'crashRecoveryPri1R2Enabled',fields:[['crashRecoveryPri1R2TriggerCents','PRI1-R2 arm target','c'],['crashRecoveryMinCrashCents','Min crash','c'],['crashRecoveryMinReboundCents','Min rebound','c'],['crashRecoveryMinUpwardTicks','Upward ticks','']],desc:'Athena-profit downstream Saint using Athena Exclamation crash/rebound/up-tick confirmation.'},
  {legacy:'Recovery Hunter',name:'Crystal Wall',key:'recoveryHunterEnabled',stake:'recoveryStakeCents',min:'recoveryMinEntryCents',max:'recoveryMaxEntryCents',fields:[['crystalWallMinCrashCents','Min crash','c'],['crystalWallMinReboundCents','Min rebound','c'],['crystalWallMinUpwardTicks','Upward ticks',''],['crystalWallWinsToTriggerAthena','Winners to trigger Athena (1-5)','']],desc:'Independent CI1 crash-rebound SHADOW proof Attack. The operator selects 1–5 consecutive independent profitable proofs required before Athena Exclamation.'},
  {legacy:'Momentum Hunter',name:'Great Horn',key:'momentumHunterEnabled',stake:'momentumStakeCents',min:'momentumMinEntryCents',max:'momentumMaxEntryCents',pri:'momentumPri1R2Enabled',fields:[['momentumPri1R2TriggerCents','PRI1-R2 arm target','c'],['momentumMinCrashCents','Min crash','c'],['momentumMinReboundCents','Min rebound','c'],['momentumMinUpwardTicks','Upward ticks','']],desc:'Athena-profit downstream Saint using Athena Exclamation crash/rebound/up-tick confirmation.'},
  {legacy:'Lightning Plasma',name:'Lightning Plasma',key:'lightningPlasmaEnabled',stake:'lightningPlasmaFieldStakeCents',min:'lightningPlasmaMinEntryCents',max:'lightningPlasmaMaxEntryCents',pri:'lightningPlasmaPri1R2Enabled',fields:[['lightningPlasmaPri1R2TriggerCents','PRI1-R2 arm target','c'],['lightningPlasmaMinCrashCents','Min crash','c'],['lightningPlasmaMinReboundCents','Min rebound','c'],['lightningPlasmaMinUpwardTicks','Upward ticks','']],rays:'lightningPlasmaMaxStrikes',desc:'Athena-profit downstream Saint using Justice-style crash/rebound/up-tick confirmation.'},
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
function inputHtml(key,label,value,suffix='',step=1,min=null,max=null){const v=drafts.has(key)?drafts.get(key):value,bounds=`${min==null?'':` min=\"${esc(min)}\"`}${max==null?'':` max=\"${esc(max)}\"`}`;return `<label>${esc(label)}<span><input data-setting-key="${esc(key)}" type="number" step="${step}"${bounds} value="${esc(v??'')}"><em>${esc(suffix)}</em></span></label>`;}
function crystalProofCount(s){return Math.max(1,Math.min(5,Math.floor(Number(s.settings?.crystalWallWinsToTriggerAthena)||3)));}
const CRYSTAL_PROOF_LABELS=Object.freeze(['Triple Crystal proof #1','Triple Crystal proof #2','Triple Crystal proof #3','Triple Crystal proof #4','Triple Crystal proof #5']);
function crystalProofBannersHtml(s){const n=crystalProofCount(s),proofs=Array.from({length:n},(_,i)=>`<span class="pill amber" aria-label="${esc(CRYSTAL_PROOF_LABELS[i])}" title="${esc(CRYSTAL_PROOF_LABELS[i])}">CW WIN ${i+1}</span>`).join(' <span aria-hidden="true">→</span> ');return `<div class="attack-authority-note"><strong>ATHENA PROOF CHAIN:</strong> ${proofs} <span aria-hidden="true">→</span> <span class="pill green">ATHENA EXCLAMATION</span></div>`;}
function attackControlsHtml(s,a){let h=inputHtml(a.stake,'Stake',s.settings?.[a.stake],'c',1)+inputHtml(a.min,'Min entry',s.settings?.[a.min],'c',1)+inputHtml(a.max,'Max entry',s.settings?.[a.max],'c',1);if(a.pri)h+=`<label>PRI1-R2 Exit Guard<span><input data-setting-bool="${esc(a.pri)}" type="checkbox" ${s.settings?.[a.pri]===true?'checked':''}></span></label>`;for(const [k,l,u] of (a.fields||[]))h+=inputHtml(k,l,s.settings?.[k],u,k.includes('Rate')?0.01:1,k==='crystalWallWinsToTriggerAthena'?1:null,k==='crystalWallWinsToTriggerAthena'?5:null);if(a.rays)h+=inputHtml(a.rays,'Max rays',s.settings?.[a.rays],'',1);if(a.repeats)h+=inputHtml(a.repeats,a.repeatLabel||'Max repeats',s.settings?.[a.repeats],'',1);const proofCount=crystalProofCount(s);let authority=a.legacy==='Athena Exclamation'?`MEGA WAVE: ${proofCount} consecutive independent profitable Crystal Wall proof${proofCount===1?'':'s'} → direct Athena Exclamation. Old convergence/Bolt authority is retired. Profitable Athena may release 0–12 enabled Saints.`:a.legacy==='Recovery Hunter'?`SHADOW ONLY: CI1 crash episode → trough → rebound proof. ${proofCount} consecutive profitable independent Crystal Wall proof${proofCount===1?'':'s'} trigger Athena Exclamation. Any Crystal Wall loss resets the unconsumed sequence.`:'MEGA WAVE DOWNSTREAM: only a profitable Athena Exclamation parent grants strategic eligibility; this Saint still must satisfy its own doctrine. PRI ON = PRI1-R2 arm/runner authority; PRI OFF = Infinity Break. Aurora remains loss authority.';const banners=a.legacy==='Recovery Hunter'?crystalProofBannersHtml(s):'';return `<div class="model-settings">${h}<button class="btn light model-save" data-model-save="${esc(a.legacy)}">Save</button></div>${banners}<div class="attack-authority-note">${authority}</div>`;}
function cosmoControlsHtml(s,c){const fields=c.fields||[];const controls=fields.length?`<div class="model-settings">${fields.map(([k,l,u])=>inputHtml(k,l,s.settings?.[k],u,1)).join('')}<button class="btn light model-save" data-model-save="${esc(c.name)}">Save</button></div>`:'';const note=c.legacy==='Gemini'?'GEMINI UNIVERSE · ANOTHER DIMENSION ATTACK · no broker order · no real/simulation portfolio capital': 'SHADOW TRADE ONLY · no broker order · no real portfolio capital';return `${controls}<div class="attack-authority-note">${note}</div>`;}
function statFor(s,name){return (s.conceptStats||[]).find(x=>x.name===name)||{};}
function renderSettings(s){const f=$('settingsForm');if(!f)return;f.innerHTML=SHARED.map(([k,l,u])=>{const step=1;const v=drafts.has(k)?drafts.get(k):s.settings?.[k];return `<label>${esc(l)}<input data-setting-key="${esc(k)}" name="${esc(k)}" type="number" step="${step}" value="${esc(v??'')}"><small>${esc(u)}</small></label>`;}).join('');}
function renderAttacks(s){const b=$('attackBody');if(!b)return;b.innerHTML=ATTACKS.map((a,i)=>{const st=statFor(s,a.legacy),enabled=s.settings?.[a.key]===true;return `<tr class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(a.name)}</div><div class="legacy-name">Legacy: ${esc(a.legacy)}</div><div class="concept-desc">${esc(a.desc)}</div>${attackControlsHtml(s,a)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(a.key)}" data-model-name="${esc(a.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td><td>${pc(st.avgEntryCents)}</td><td>${st.total||0}</td><td>${st.open||0}</td><td>${st.closed||0}</td><td>${st.wins||0}/${st.losses||0}</td><td>${pct01(st.winRate)}</td><td class="${pnlClass(st.pnlCents)}">${money(st.pnlCents)}</td></tr>`;}).join('');}
function renderCosmos(s){const b=$('cosmoBody');if(!b)return;b.innerHTML=COSMOS.map((c,i)=>{const st=c.legacy==='Gemini'?(s.gemini||{}):statFor(s,c.legacy),enabled=s.settings?.[c.key]===true;const shadowTrades=c.legacy==='Gemini'?(st.total??0):(st.feederSignals??st.total??0);const open=st.open||0;const fed=c.legacy==='Gemini'?'-':(st.fedHunters??0);const pnl=c.legacy==='Gemini'?(st.pnlCents??0):st.pnlCents;return `<tr class="${enabled?'':'model-disabled'}"><td>${i+1}</td><td class="concept-cell"><div class="concept-name">${esc(c.name)}</div><div class="concept-desc">${esc(c.desc||'Reference intelligence for Atomic Thunder Bolt and Athena.')}</div>${cosmoControlsHtml(s,c)}</td><td><button class="model-toggle ${enabled?'enabled':'disabled'}" data-model-key="${esc(c.key)}" data-model-name="${esc(c.name)}" data-enabled="${enabled}">${enabled?'ON':'OFF'}</button></td><td>${shadowTrades}</td><td>${open}</td><td>${pc(st.avgEntryCents)}</td><td>${pc(st.avgCurrentCents)}</td><td>${fed}</td><td class="${pnlClass(pnl)}">${money(pnl)}</td></tr>`;}).join('');}

function renderBolt(s){const b=s.atomicThunderBolt||{},e=b.episodes||{},g=b.greenTrigger||{},pg=b.patternGuardian||{},f=s.entryCandidateFunnel||{},bs=f.byStage||{},dd=f.dedup||{};setText('boltStatus',b.version||'ATOMIC-THUNDER-BOLT-V2');$('boltStatus').className='pill green';setText('boltTotal',e.total??b.detected??0);setText('boltFire',e.fire??0);setText('boltWatch',e.watch??0);setText('boltReject',e.reject??0);setText('boltExpired',e.expired??0);setText('boltClean',e.clean??0);setText('boltToxic',e.toxicLate??0);setText('boltFalse',e.falseBolt??0);const input=$('atomicThunderGreenTrigger');if(input&&!input.matches(':focus'))input.value=s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1;setText('atomicThunderPatternNote',`COSMO_GREEN: executable bid must move +${Number(s.settings?.atomicThunderGreenTriggerCents??g.triggerCents??1)}c from the shadow entry. ${g.boltedShadowTrades||0} shadow trades have emitted a Bolt. One Bolt per shadow trade. Legacy ${pg.version||'ATB2'} is ${pg.authority||'RESEARCH_ONLY'} and cannot veto or delay.`);setText('entryCandidateFunnelNote',`${f.version||'ECF1'} chain: ${f.uniqueCandidates||0} candidates → ${bs.COSMO_GREEN||0} GREEN → ${bs.BOLT||0} Bolt → ${bs.ATHENA_FIRE||0} FIRE → ${bs.EXECUTION_ELIGIBLE||0} execution eligible → ${bs.OPENED||0} opened. Dedup: ${dd.athenaUnchangedSuppressed||0} unchanged Athena callbacks suppressed, ${dd.athenaChangedStateRetries||0} changed-state retries, ${dd.scarletUnchangedSuppressed||0} unchanged Needle triggers suppressed.`);const r=$('opportunityResearch');if(r)r.textContent=`Historical opportunity research remains telemetry only. Complete episodes: ${e.complete||0} · CLEAN ${e.clean||0} · TOXIC/LATE ${e.toxicLate||0} · FALSE ${e.falseBolt||0}. It has no authority over COSMO_GREEN → Bolt.`;}
function renderAthena(s){const a=s.athena||{},m=a.memory||{},d=a.lastDecision||null,b=d?.ranking?.[0]||null,target=d?.configuredTargetNetPerOriginalContractCents??s.settings?.infinityBreakMinNetPerOriginalContractCents;setText('athenaStatus',a.version||'ATHENA-A3');$('athenaStatus').className=`pill ${a.loadedAtMs?'green':'amber'}`;setText('arayashikiStatus','DIRECT');setText('athenaSurvivalCertified','OFF');setText('athenaSurvivalRejected','RANKING');setText('athenaTarget',target==null?'-':`${pc(target)} net / original contract`);setText('athenaEntries',m.entryRows||0);setText('athenaEpisodes',m.opportunityRows||0);setText('athenaProfitEpisodes',m.profitEpisodeRows||0);setText('athenaProfiles',m.profileCount||0);setText('athenaDecisions',a.decisions||0);setText('athenaFire',a.fire||0);setText('athenaWatch',a.watch||0);setText('athenaReject',a.reject||0);setText('athenaExpired',a.expired||0);setText('athenaLastEV',b?.expectedNetPerOriginalContractCents==null?'-':`${dpc(b.expectedNetPerOriginalContractCents)} / contract`);setText('athenaLastTargetProb',pct01(b?.targetHitProbability));const green=d?.fireCommand?.decisionEvidence?.greenTrigger||null;setText('athenaLast',d?`${d.decision} · ${d.selectedAttackDisplay||d.selectedAttack||'-'} · ${d.reason||'-'} · target ${pc(d.configuredTargetNetPerOriginalContractCents??target)} · ranked EV ${b?.expectedNetPerOriginalContractCents==null?'-':dpc(b.expectedNetPerOriginalContractCents)} · P(target) ${pct01(b?.targetHitProbability)} · Cosmos ${green?.cosmo||'-'} ${green?.moveCents==null?'':dpc(green.moveCents)} · Bolt ${d.boltId||'-'} · Needle armed ${a.scarletNeedle?.armed||0}`:`No Athena decision yet. · Needle armed ${a.scarletNeedle?.armed||0}`);}
function renderInfinity(s){const x=s.infinityBreak||{};setText('infinityStatus',x.version||'INFINITY-BREAK-V1');$('infinityStatus').className='pill green';for(const [id,key] of [['infinityMinNet','infinityBreakMinNetPerOriginalContractCents'],['infinityConfirmations','infinityBreakRequiredConfirmations'],['infinityBookAge','infinityBreakMaximumBookAgeMs'],['infinityWindow','infinityBreakConfirmationWindowMs']]){const el=$(id);if(el&&!el.matches(':focus'))el.value=s.settings?.[key]??'';}setText('infinityObserved',x.positionsObserved||0);setText('infinityActive',x.activePositions||0);setText('infinityBreaks',x.breaksExecuted||0);setPnl('infinityRealized',x.realizedPnlCents);setPnl('infinityAverage',x.averageProfitCents);setText('infinityTime',duration(x.averageTimeToBreakMs));}
function renderAurora(s){const a=s.auroraExecution||{};setText('auroraStatus',a.version||'AURORA-V2');$('auroraStatus').className='pill green';const inp=$('auroraDamagePercent');if(inp&&!inp.matches(':focus'))inp.value=s.settings?.auroraDamageControlPercent??a.damageControlPercent??45;setText('auroraProtected',a.protectedHunters||0);setText('auroraActive',a.activeAuroraPositions||0);setText('auroraExits',a.auroraExits||0);setText('auroraAverageStop',pc(a.averageAuroraStopCents));setText('auroraAveragePct',a.averageEconomicLossRatio==null?'-':`${(Number(a.averageEconomicLossRatio)*100).toFixed(1)}%`);setPnl('auroraRealized',a.realizedAuroraPnlCents);setPnl('auroraAverageLoss',a.averageAuroraLossCents);setText('auroraRecovered',a.recoveredAfterAuroraExit||0);}
function cosmosName(e){return String(e?.systemName||e?.cosmos||'').toUpperCase()||'-';}
function renderTrades(s){
  const open=s.openHunters||[],closed=s.closedHunters||[],allFeed=s.cosmoShadowTrades||s.openFeeders||[],feed=COSMO_FILTER==='ALL'?allFeed:allFeed.filter(e=>e.conceptName===COSMO_FILTER),gemini=s.geminiTrades||[],crystal=s.crystalWallTrades||[];
  setText('openHunterCount',`(${open.length})`);
  setText('hunterSummary',`${open.length} open · per-position frozen profit authority · Aurora loss side`);
  $('openHunterBody').innerHTML=open.map(e=>{
    const danger=e.aurora?.dangerPriceCents??e.aurora?.dangerLineCents;
    const profitAuthority=e.entryConfig?.profitAuthority||e.entryConfig?.infinityBreak?.version||'legacy';
    return `<tr><td>${esc(cosmosName(e))}</td><td class="ticker">${esc(e.ticker)}</td><td>${esc(e.executionAttackName||e.conceptName)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentPriceCents)}</td><td>${pc(e.peakPriceCents)}</td><td>${e.aurora?`${Number(e.aurora.damageControlPercent??e.aurora.maximumEconomicLossRatio*100??0).toFixed(1)}% / ${pc(danger)}`:'legacy'}</td><td>${esc(profitAuthority)}</td><td>${e.remainingCount??e.count??0}</td><td>${esc(e.status)}</td><td class="${pnlClass(e.positionPnlCents)}">${money(e.positionPnlCents)}</td><td><button class="btn emergency-exit" data-emergency-entry="${esc(e.id)}" data-emergency-name="${esc(e.executionAttackName||e.conceptName)}">Emergency Exit</button></td></tr>`;
  }).join('')||'<tr><td colspan="12" class="muted">No open Execution Attacks.</td></tr>';
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
  setText('crystalWallTradeCount',`(${crystal.length})`);
  const cb=$('crystalWallTradeBody');
  if(cb)cb.innerHTML=crystal.map(e=>{
    const x=e.virtualExecution||{},state=e.status==='closed'?(Number(e.pnlCents)>0?'WIN':Number(e.pnlCents)<0?'LOSS':'SCRATCH'):'OPEN',stateClass=state==='WIN'?'green':state==='LOSS'?'red':'amber';
    const execText=x.fullPositionExecutable===true?`${pc(x.executableAverageBidCents)} / ${x.executableCount??e.count}/${x.requiredCount??e.count}`:x.executableCount?`${pc(x.executableAverageBidCents)} / ${x.executableCount}/${x.requiredCount??e.count}`:'-';
    const confirmText=e.status==='closed'?'-':`${x.confirmations??0}/${x.requiredConfirmations??e.entryConfig?.virtualInfinity?.requiredFreshConfirmations??1}`;
    const profitText=e.status==='closed'?esc(e.closeReason||'-'):`+${pc(x.targetNetPerOriginalContractCents??e.entryConfig?.virtualInfinity?.minimumNetPerOriginalContractCents??1)} net · ${confirmText} · ${esc(x.holdReason||x.action||'observing')}`;
    const danger=e.aurora?.dangerPriceCents??e.stopPriceCents,p=e.status==='closed'?e.pnlCents:e.shadowPnlCents;
    return `<tr><td><div>${esc(e.marketTitle||'')}</div><div class="ticker">${esc(e.ticker)}</div></td><td>Crystal Wall</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.currentPriceCents)}</td><td>${execText}</td><td>${pc(e.peakPriceCents)}</td><td>${pc(e.lowestPriceAfterEntryCents)} / ${dpc(-(Number(e.maeCents||0)))}</td><td>${e.aurora?`${Number(e.aurora.damageControlPercent??0).toFixed(1)}% / ${pc(danger)}`:'-'}</td><td>${profitText}</td><td>${e.remainingCount??e.count??0}</td><td><span class="pill ${stateClass}">${state}</span></td><td class="${pnlClass(p)}">${money(p)}</td><td>${pc(e.exitPriceCents)}</td><td>${esc(e.closeReason||x.holdReason||'-')}</td><td>${e.openedAtMs?new Date(e.openedAtMs).toLocaleString():'-'}</td><td>${e.closedAtMs?new Date(e.closedAtMs).toLocaleString():'-'}</td></tr>`;
  }).join('')||'<tr><td colspan="16" class="muted">No Crystal Wall shadow trades yet.</td></tr>';
  setText('closedCount',`(${closed.length})`);
  if($('closedPositionsFold')?.open)$('closedBody').innerHTML=closed.map(e=>{const p=e.postExitState||{};const post=e.postExitCurrentPriceCents??p.latestMarketPriceCents??e.currentPriceCents;const delta=e.postExitDeltaFromExitCents??p.deltaFromExitCents;const best=e.postExitBestPriceCents??p.bestExecutableBidCents;const bestDelta=e.postExitBestDeltaCents??p.bestDeltaFromExitCents;const missed=e.postExitMissedUpsideCents??p.missedUpsideNetCents;const worst=e.postExitWorstPriceCents??p.worstExecutableBidCents;const worstDelta=e.postExitWorstDeltaCents??p.worstDeltaFromExitCents;const saved=e.postExitLossAvoidedCents??p.lossAvoidedNetCents;return `<tr><td>${esc(cosmosName(e))}</td><td class="ticker">${esc(e.ticker)}</td><td>${esc(e.executionAttackName||e.conceptName)}</td><td>${pc(e.entryPriceCents)}</td><td>${pc(e.exitPriceCents)}</td><td>${pc(post)}</td><td class="${pnlClass(delta)}">${dpc(delta)}</td><td>${best==null?'-':`${pc(best)} (${dpc(bestDelta)})`}</td><td class="${pnlClass(missed)}">${missed==null?'-':money(missed)}</td><td>${worst==null?'-':`${pc(worst)} (${dpc(worstDelta)})`}</td><td class="${pnlClass(saved)}">${saved==null?'-':money(saved)}</td><td>${esc(e.closeReason||'-')}</td><td class="${pnlClass(e.pnlCents)}">${money(e.pnlCents)}</td><td>${e.openedAtMs?new Date(e.openedAtMs).toLocaleString():'-'}</td><td>${e.closedAtMs?new Date(e.closedAtMs).toLocaleString():'-'}</td></tr>`;}).join('')||'<tr><td colspan="15">No closed positions.</td></tr>';
  if($('trackedMarketsFold')?.open)$('trackedBody').innerHTML=(s.trackedMarkets||[]).map(t=>`<tr><td class="ticker">${esc(t.ticker)}</td><td>${esc(t.market_title||t.marketTitle||'')}</td><td>${pc(t.yes_bid_cents??t.yesBid)}</td><td>${pc(t.yes_ask_cents??t.yesAsk)}</td><td>${t.scan_count??t.scanCount??0}</td><td>${t.last_scan_ms?new Date(Number(t.last_scan_ms)).toLocaleTimeString():'-'}</td></tr>`).join('');
  for(const btn of document.querySelectorAll('[data-cosmo-filter]'))btn.classList.toggle('active',btn.dataset.cosmoFilter===COSMO_FILTER);
}


function currentCosmosId(){const h=String(location.hash||'').replace(/^#/, '');const m=h.match(/^cosmos\/([A-Za-z]+)$/i);return m?m[1].toUpperCase():null;}
function renderTwelveCosmos(s){
  const rows=s.constellationOverview||s.constellation?.rooms||[];
  const b=$('twelveCosmosBody');
  if(b){
    const list=rows.length?rows:['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map((id)=>({id,displayName:id,open:0,closed:0,pnlCents:0,minGameMinutes:s.settings?.minGameMinutes,maxGameMinutes:s.settings?.maxGameMinutes}));
    b.innerHTML=list.map((row)=>{
      const id=row.id||row.displayName;
      const window=`${row.minGameMinutes??s.settings?.minGameMinutes??0}-${row.maxGameMinutes??s.settings?.maxGameMinutes??0}`;
      return `<tr><td>${esc(row.displayName||id)}</td><td>${esc(window)}</td><td>${Number(row.open||0)}</td><td>${Number(row.closed||0)}</td><td class="${pnlClass(row.pnlCents)}">${money(row.pnlCents)}</td><td><a class="btn light" href="#cosmos/${esc(id)}">Settings</a></td></tr>`;
    }).join('');
  }
  const st=$('twelveCosmosStatus');
  if(st){st.textContent=`${(s.constellationOverview||[]).length||12} rooms`;st.className='pill green';}
  const editor=$('cosmosEditor');
  const active=currentCosmosId();
  ACTIVE_COSMOS=active;
  const homeOnly=$('twelveCosmosHomeOnly');
  if(homeOnly) homeOnly.classList.toggle('hidden', Boolean(active));
  const subset=$('twelveCosmosSubset');
  if(subset) subset.classList.toggle('hidden', Boolean(active));
  const subsetFold=$('twelveCosmosSubsetFold');
  if(subsetFold) subsetFold.classList.toggle('hidden', Boolean(active));
  const saintFold=$('saintSubsetFold');
  if(saintFold) saintFold.classList.toggle('hidden', Boolean(active));
  if(editor){
    editor.classList.toggle('hidden',!active);
    if(active){
      setText('cosmosEditorTitle',`${active} SETTINGS`);
      setText('cosmosEditorNote',`Editing ${active} only. These boards show this room's saved settings.`);
      if(COSMOS_VIEW_ID!==active){
        COSMOS_VIEW_ID=active;
        COSMOS_VIEW_SETTINGS=null;
        fetch(`/api/cosmos/${active}/settings`,{cache:'no-store'}).then(async(r)=>{
          const j=await r.json();
          if(!r.ok)throw new Error(j.error||'cosmos_settings_unavailable');
          if(currentCosmosId()!==active)return;
          COSMOS_VIEW_SETTINGS=j.settings||j;
          CONTROL_FINGERPRINT='';
          if(STATE) render(STATE);
        }).catch((e)=>msg(e.message,true));
      }
    } else {
      COSMOS_VIEW_ID=null;
      COSMOS_VIEW_SETTINGS=null;
    }
  }
}
function renderSystem(s){const p=s.performance||{},h=s.health||{},r=s.resourceUsage||{};setText('portfolioValueLabel',s.settings?.mode==='LIVE'?'Kalshi Portfolio':'Portfolio Value');if(s.settings?.mode==='LIVE'&&p.portfolioValueCents==null){setText('portfolioValue','Kalshi —');const el=$('portfolioValue');if(el)el.className='';}else setPnl('portfolioValue',p.portfolioValueCents,true);setPnl('simFreeCash',p.simulationCashCents,true);setText('winRate',pct01(p.winRate));setPnl('unrealized',p.unrealizedCents);setPnl('realized',p.realizedCents);setPnl('profitToday',p.dayRealizedCents);setPnl('profitWeek',p.weekRealizedCents);setPnl('profitMonth',p.monthRealizedCents);setPnl('profitYear',p.yearRealizedCents);setText('openCount',p.open||0);setText('closedPerfCount',p.closed||0);setText('releaseLabel',s.settings?.release||s.release||'R60-COSMO-GREEN');setText('modeBtn',s.settings?.mode||'SIMULATION');$('modeBtn').className=`btn ${s.settings?.mode==='LIVE'?'danger':'light'}`;setText('modeNote',s.settings?.mode==='LIVE'?(s.settings?.liveArmed?'LIVE armed':'LIVE selected, disarmed'):'Paper trading - no real orders.');setText('engineBtn',s.settings?.engineActive?'Stop Engine':'Start Engine');setText('engineStatus',s.settings?.engineActive?'Engine running':'Engine stopped');$('engineStatus').className=`pill ${s.settings?.engineActive?'green':'red'}`;setText('systemStatus',h.degraded?'DEGRADED':'HEALTHY');$('systemStatus').className=`pill ${h.degraded?'red':'green'}`;setText('uptime',duration(Date.now()-Number(h.startedAtMs||Date.now())));const errors=(s.audit||[]).filter(x=>x.level==='error');$('errorWatchdog').classList.toggle('hidden',!errors.length);if(errors.length)$('errorWatchdog').textContent=`Error Watchdog — ${errors.length} recent errors · ${errors[0].event}: ${errors[0].data?.message||''}`;const scan=s.scanner||{};const scanFresh=Number(scan.lastScanMs||0)>0&&Date.now()-Number(scan.lastScanMs)<10*60*1000;setText('entryRunning',scanFresh?'Running':'Waiting');$('entryRunning').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerActive',scanFresh?'ACTIVE':'WAITING');$('scannerActive').className=`pill ${scanFresh?'green':'amber'}`;setText('scannerDetail',`Tracked ${scan.tracked||0} · active markets ${scan.activeMarkets||0} · last scan ${scan.lastScanMs?duration(Date.now()-scan.lastScanMs)+' ago':'never'}`);const resourceState=r.pressureState||r.status||'UNKNOWN';setText('resourceStatus',resourceState);$('resourceStatus').className=`pill ${['NORMAL','GREEN'].includes(resourceState)?'green':['WATCH','COMPACT','PRESSURE'].includes(resourceState)?'amber':'red'}`;setText('resourceRss',mib(r.memory?.rssBytes??r.rssBytes));setText('resourceHeapUsed',mib(r.memory?.heapUsedBytes??r.heapUsedBytes));setText('resourceCpu',Number.isFinite(Number(r.cpuPercent))?`${Number(r.cpuPercent).toFixed(1)}%`:'-');setText('resourceUptime',duration((r.uptimeSeconds??r.processUptimeSeconds??0)*1000));setText('connectionPill',h.restOk&&h.websocketFresh?'Connected':'Connection check');$('connectionPill').className=`pill ${h.restOk&&h.websocketFresh?'green':'amber'}`;$('systemNameInput').value=s.settings?.systemName||'SAGITTARIUS';}
function renderGalactic(s){const on=s.settings?.galacticExplosionEnabled===true;setText('galacticStatus',on?'ON':'OFF');$('galacticStatus').className=`pill ${on?'amber':'red'}`;const b=$('galacticExplosionToggle');b.textContent=on?'ON':'OFF';b.dataset.enabled=String(on);b.className=`galactic-toggle ${on?'enabled':'disabled'}`;}
function controlFingerprint(s){try{return JSON.stringify({settings:s.settings||{},conceptStats:s.conceptStats||[],gemini:s.gemini||{},crystalWallShadow:s.crystalWallShadow||{}});}catch{return String(Date.now());}}
function boardState(s){const id=currentCosmosId();if(id&&COSMOS_VIEW_ID===id&&COSMOS_VIEW_SETTINGS)return {...s,settings:{...(s.settings||{}),...COSMOS_VIEW_SETTINGS,systemName:id}};return s;}
function render(s){STATE=s;renderTwelveCosmos(s);renderSystem(s);renderBolt(s);renderAthena(s);renderInfinity(s);renderAurora(s);renderTrades(s);const view=boardState(s);const fp=controlFingerprint(view);if(fp!==CONTROL_FINGERPRINT){CONTROL_FINGERPRINT=fp;renderSettings(view);renderAttacks(view);renderCosmos(view);renderGalactic(view);}}
function scheduleRender(s){pendingRenderState=s;if(renderFrame)return;const flush=()=>{renderFrame=0;const latest=pendingRenderState;pendingRenderState=null;if(latest)render(latest);};renderFrame=(window.requestAnimationFrame||((fn)=>setTimeout(fn,0)))(flush);}
async function load(){try{const r=await fetch('/api/state',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'State unavailable');render(j);}catch(e){console.error(e);msg(e.message,true);}}
async function patchSettingsVerified(data){const cosmos=currentCosmosId();const url=cosmos?`/api/cosmos/${cosmos}/settings`:'/api/settings';const j=await patch(url,data);const state=j.state||j;const settings=state.settings||state;for(const [k,v] of Object.entries(data)){if(k==='systemName')continue;if(Number.isFinite(Number(v))&&Number(settings?.[k])!==Number(v))throw new Error(`Setting ${k} did not persist exactly`);if(typeof v==='boolean'&&settings?.[k]!==v)throw new Error(`Setting ${k} did not persist exactly`);}return STATE?{...STATE,settings:{...(STATE.settings||{}),...settings}}:state;}
function bindBoard(id){const b=$(id);b.oninput=e=>{const i=e.target.closest('[data-setting-key]');if(i)drafts.set(i.dataset.settingKey,i.value);};b.onclick=async e=>{const save=e.target.closest('[data-model-save]');if(save){const row=save.closest('tr'),data={};for(const i of row.querySelectorAll('[data-setting-key]'))data[i.dataset.settingKey]=Number(i.value);for(const i of row.querySelectorAll('[data-setting-bool]'))data[i.dataset.settingBool]=i.checked===true;save.disabled=true;try{const fresh=await patchSettingsVerified(data);for(const k of Object.keys(data))drafts.delete(k);render(fresh);msg(`${save.dataset.modelSave} settings saved.`);}catch(x){msg(x.message,true);}finally{save.disabled=false;}return;}const btn=e.target.closest('[data-model-key]');if(!btn)return;const key=btn.dataset.modelKey,enable=btn.dataset.enabled!=='true';btn.disabled=true;try{const fresh=await patchSettingsVerified({[key]:enable});render(fresh);msg(`${btn.dataset.modelName} ${enable?'enabled':'disabled'}.`);}catch(x){msg(x.message,true);}finally{btn.disabled=false;}};}
bindBoard('attackBody');bindBoard('cosmoBody');
$('settingsForm').oninput=e=>{const i=e.target.closest('[data-setting-key]');if(i)drafts.set(i.dataset.settingKey,i.value);};
$('settingsForm').onsubmit=async e=>{e.preventDefault();const data={};for(const [k] of SHARED)if(drafts.has(k))data[k]=Number(drafts.get(k));if(!Object.keys(data).length)return msg('No shared setting changes.');try{const fresh=await patchSettingsVerified(data);for(const k of Object.keys(data))drafts.delete(k);render(fresh);msg('Shared settings saved and verified.');}catch(x){msg(x.message,true);}};
$('atomicThunderGreenSave').onclick=async()=>{const data={atomicThunderGreenTriggerCents:Number($('atomicThunderGreenTrigger').value)};try{render(await patchSettingsVerified(data));msg('Atomic Thunder GREEN trigger saved. New threshold applies to future green crossings; already emitted shadow Bolts remain one-shot.');}catch(e){msg(e.message,true);}};
$('infinitySave').onclick=async()=>{const data={infinityBreakMinNetPerOriginalContractCents:Number($('infinityMinNet').value),infinityBreakRequiredConfirmations:Number($('infinityConfirmations').value),infinityBreakMaximumBookAgeMs:Number($('infinityBookAge').value),infinityBreakConfirmationWindowMs:Number($('infinityWindow').value)};try{render(await patchSettingsVerified(data));msg('Infinity Break settings saved.');}catch(e){msg(e.message,true);}};
$('auroraSave').onclick=async()=>{try{render(await patchSettingsVerified({auroraDamageControlPercent:Number($('auroraDamagePercent').value)}));msg('Aurora Damage Control % saved. New value applies only to future trades; open trades keep their frozen entry percentage.');}catch(e){msg(e.message,true);}};
$('galacticExplosionToggle').onclick=async()=>{const on=$('galacticExplosionToggle').dataset.enabled==='true';if(!on&&!confirm('Enable Galactic Explosion? Different Athena-authorized Attacks may coexist on the same exact ticker.'))return;try{render(await patchSettingsVerified({galacticExplosionEnabled:!on}));}catch(e){msg(e.message,true);}};
$('openHunterBody').onclick=async e=>{const b=e.target.closest('[data-emergency-entry]');if(!b)return;if(!confirm(`Emergency exit ${b.dataset.emergencyName||'this Attack'}?`))return;b.disabled=true;try{const r=await post('/api/emergency-exit',{entryId:b.dataset.emergencyEntry});await load();msg(r.closed?'Emergency Exit completed.':r.pending?'Emergency Exit committed; reconciliation pending.':`Not executed: ${r.skipped||r.reason||'unknown'}`,!r.closed&&!r.pending);}catch(x){msg(x.message,true);}finally{b.disabled=false;}};
$('modeBtn').onclick=async()=>{try{if(STATE.settings.mode==='LIVE')await post('/api/mode',{mode:'SIMULATION'});else{const phrase=prompt('Type ENABLE LIVE TRADING to arm real Kalshi orders.');if(phrase==null)return;await post('/api/mode',{mode:'LIVE',confirmation:phrase});}await load();}catch(e){msg(e.message,true);}};
$('engineBtn').onclick=async()=>{try{await post('/api/engine',{active:!STATE.settings.engineActive});await load();}catch(e){msg(e.message,true);}};
const scan=async()=>{try{await post('/api/run-scan');msg('Scan requested.');}catch(e){msg(e.message,true);}};$('scanBtn').onclick=scan;$('modelScanBtn').onclick=scan;
$('resetDefaultsBtn').onclick=async()=>{if(!confirm('Reset all operator settings to factory defaults? Open trades stay. This does not wipe learning.'))return;try{await post('/api/reset-defaults');await load();msg('Settings restored to factory defaults.');}catch(e){msg(e.message,true);}};
$('resetDashboardBtn').onclick=async()=>{if(!confirm('Reset dashboard performance baseline? Learning and trades are not deleted.'))return;try{await post('/api/reset-dashboard');await load();}catch(e){msg(e.message,true);}};
$('resetSimulationBtn').onclick=async()=>{if(!confirm('Archive the current simulation cohort? Athena historical memory and learning remain preserved.'))return;try{await post('/api/reset-simulation');await load();}catch(e){msg(e.message,true);}};
$('athenaRebuildBtn').onclick=async()=>{if(!confirm('Refresh Athena A3 economic memory from the complete stored Sagittarius history? This is allowed only under the server safety gate.'))return;try{await post('/api/athena/rebuild');await load();msg('Athena A3 economic memory refreshed.');}catch(e){msg(e.message,true);}};
$('credentialsForm').onsubmit=async e=>{e.preventDefault();try{if($('systemNameInput').value&&$('systemNameInput').value!==STATE.settings.systemName)await patch('/api/settings',{systemName:$('systemNameInput').value});const keyId=$('apiKeyInput').value.trim(),privateKeyPem=$('privateKeyInput').value.trim();if(keyId&&privateKeyPem)await post('/api/credentials',{keyId,privateKeyPem});else if(keyId||privateKeyPem)throw new Error('Enter both API Key ID and private key PEM.');$('privateKeyInput').value='';await load();msg('Configuration saved.');}catch(x){msg(x.message,true);}};
$('testConnectionBtn').onclick=async()=>{try{await post('/api/test-connection');await load();msg('Kalshi REST authentication successful.');}catch(e){msg(e.message,true);}};
$('cosmoShadowFilter')?.addEventListener('click',e=>{const b=e.target.closest('[data-cosmo-filter]');if(!b)return;COSMO_FILTER=b.dataset.cosmoFilter||'ALL';if(STATE)renderTrades(STATE);});
for(const id of ['openCosmoSignalsFold','geminiTradesFold','crystalWallTradesFold','closedPositionsFold','trackedMarketsFold'])$(id)?.addEventListener('toggle',()=>{if(STATE)renderTrades(STATE);});
function clock(){setText('madridClock',new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'short'}).format(new Date())+' Europe/Madrid');}
setInterval(clock,1000);clock();load();const es=new EventSource('/api/events');es.onmessage=e=>{try{scheduleRender(JSON.parse(e.data));}catch{}};es.onerror=()=>{};

window.addEventListener('hashchange',()=>{if(STATE)renderTwelveCosmos(STATE);});
function selectedSubsetCosmosIds(){return [...document.querySelectorAll('[data-subset-cosmos]:checked')].map((el)=>String(el.dataset.subsetCosmos||'').toUpperCase()).filter(Boolean);}
$('subsetSelectAllBtn')?.addEventListener('click',()=>{for(const el of document.querySelectorAll('[data-subset-cosmos]'))el.checked=true;});
$('subsetClearBtn')?.addEventListener('click',()=>{for(const el of document.querySelectorAll('[data-subset-cosmos]'))el.checked=false;});
$('subsetApplyBtn')?.addEventListener('click',async()=>{
  const ids=selectedSubsetCosmosIds();
  const crash=Math.floor(Number($('subsetCrystalCrash')?.value));
  const rebound=Math.floor(Number($('subsetCrystalRebound')?.value));
  const ticks=Math.floor(Number($('subsetCrystalTicks')?.value));
  if(!ids.length)return msg('Select at least one cosmos.',true);
  if(!Number.isInteger(crash)||!Number.isInteger(rebound)||!Number.isInteger(ticks))return msg('Enter Crystal Wall crash, rebound and upward ticks.',true);
  try{
    const r=await post('/api/cosmos/subset',{ids,patch:{crystalWallMinCrashCents:crash,crystalWallMinReboundCents:rebound,crystalWallMinUpwardTicks:ticks}});
    if(!r?.ok && !r?.count) throw new Error(r?.error||'subset_save_failed');
    const written=Array.isArray(r.results)?r.results:[];
    for(const row of written){
      if(row?.cosmos===COSMOS_VIEW_ID&&row.settings)COSMOS_VIEW_SETTINGS=row.settings;
    }
    CONTROL_FINGERPRINT='';
    await load();
    msg(`Crystal Wall crash/rebound/ticks saved on ${r.count||ids.length} rooms.`);
  }catch(e){msg(e.message,true);}
});


const SAINT_SUBSET_FIELDS={
  athena:['athenaExclamationMinCrashCents','athenaExclamationMinReboundCents','athenaExclamationMinUpwardTicks','Athena Exclamation'],
  scarlet:['scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks','Scarlet Needle'],
  justice:['justiceArrowMinCrashCents','justiceArrowMinReboundCents','justiceArrowMinUpwardTicks','Justice Arrow'],
  wave:['waveMinCrashCents','waveMinReboundCents','waveMinUpwardTicks','Wave Surfer'],
  horn:['momentumMinCrashCents','momentumMinReboundCents','momentumMinUpwardTicks','Great Horn'],
  starlight:['crashRecoveryMinCrashCents','crashRecoveryMinReboundCents','crashRecoveryMinUpwardTicks','Starlight Extinction'],
  plasma:['lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks','Lightning Plasma'],
};
$('subsetSaintApplyBtn')?.addEventListener('click',async()=>{
  const ids=selectedSubsetCosmosIds();
  const chosen=String($('subsetSaintAttack')?.value||'');
  const fields=SAINT_SUBSET_FIELDS[chosen];
  const crash=Math.floor(Number($('subsetSaintCrash')?.value));
  const rebound=Math.floor(Number($('subsetSaintRebound')?.value));
  const ticks=Math.floor(Number($('subsetSaintTicks')?.value));
  if(!ids.length)return msg('Select at least one cosmos.',true);
  if(!fields)return msg('Choose Athena or a Saint attack.',true);
  if(!Number.isInteger(crash)||!Number.isInteger(rebound)||!Number.isInteger(ticks))return msg('Enter crash, rebound and upward ticks.',true);
  try{
    const patch={[fields[0]]:crash,[fields[1]]:rebound,[fields[2]]:ticks};
    const r=await post('/api/cosmos/subset',{ids,patch});
    if(!r?.ok && !r?.count) throw new Error(r?.error||'subset_save_failed');
    const written=Array.isArray(r.results)?r.results:[];
    for(const row of written){
      if(row?.cosmos===COSMOS_VIEW_ID&&row.settings)COSMOS_VIEW_SETTINGS=row.settings;
    }
    CONTROL_FINGERPRINT='';
    await load();
    msg(`${fields[3]} crash/rebound/ticks saved on ${r.count||ids.length} rooms.`);
  }catch(e){msg(e.message,true);}
});

$('homeBtn')?.addEventListener('click', (event) => {
  event.preventDefault();
  location.hash = 'home';
  if (STATE) renderTwelveCosmos(STATE);
});
