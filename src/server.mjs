import {EXECUTION_REPORT_VERSION,EXECUTION_ATTACKS,actualOpenExposure,executionValuation} from './executionReporting.mjs';
import http from 'node:http';
import { BUILD_INFO } from './authority.mjs';
import { FEEDER_CONCEPTS, SHADOW_ATTACK_CONCEPTS, PORTFOLIO_CONCEPTS, isShadowSaintEntry } from './doctrine.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const json=(res,status,data)=>{const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(body);};
const body=async(req)=>{let raw='';for await(const c of req){raw+=c;if(raw.length>2_000_000)throw new Error('Request too large');}return raw?JSON.parse(raw):{};};
const attachment=(res,name,text,type='text/plain; charset=utf-8')=>{const bytes=Buffer.byteLength(String(text??''),'utf8');res.writeHead(200,{'content-type':type,'content-disposition':`attachment; filename="${name}"`,'content-length':String(bytes),'cache-control':'no-store'});res.end(text);};
export const DIAGNOSTIC_EXPORT_MAX_BYTES=1_000_000;
export const DIAGNOSTIC_EXPORT_TARGET_BYTES=950_000;
export const TRADING_LOG_EXPORT_MAX_BYTES=1_000_000;
export const TRADING_LOG_EXPORT_TARGET_BYTES=950_000;
export const DIAGNOSTIC_COLLECTION_TIMEOUT_MS=5_000;
export const TRADING_LOG_COLLECTION_TIMEOUT_MS=5_000;

export const EXPORT_FILE_LIMIT_BYTES=1_000_000;
export const EXPORT_PART_MAX_BYTES=999_999;
export const EXPORT_PACKAGE_MAX_BYTES=1_000_000;
// Diagnostics may refuse an oversized window; trading rows remain untouched.
export const LEDGER_EXPORT_MEMORY_MAX_BYTES=64*1024*1024;
export const LEDGER_EXPORT_SCHEMA='LEDGER-EXPORT-V3-COMBINED-EXECUTION';
const EXPORT_COUNTING_RULES='Each retained sag_entries row is one ledger record. Rejected and unfilled intents are not open positions. A clone group is the shared parent or crash episode, not an independent event. Multiply does not divide counts. Dashboard closed table is the latest 60 rows only and is not the ledger.';

function sha256(text){return createHash('sha256').update(text).digest('hex');}
function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){c^=b;for(let i=0;i<8;i+=1)c=(c>>>1)^(c&1?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
export function zipStore(files){
  const locals=[];const centrals=[];let offset=0;
  for(const f of files){
    const name=Buffer.from(f.name);const data=Buffer.isBuffer(f.data)?f.data:Buffer.from(String(f.data),'utf8');
    const crc=crc32(data);const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0,8);
    local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    locals.push(local,name,data);
    const cen=Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50,0);cen.writeUInt16LE(20,4);cen.writeUInt16LE(20,6);cen.writeUInt32LE(crc,16);
    cen.writeUInt32LE(data.length,20);cen.writeUInt32LE(data.length,24);cen.writeUInt16LE(name.length,28);cen.writeUInt32LE(offset,42);
    centrals.push(cen,name);offset+=30+name.length+data.length;
  }
  const central=Buffer.concat(centrals);const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,central,end]);
}
function num(v){if(v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function cutoffAfter(at,cutoff){return Number(cutoff)>0&&Number(at)>Number(cutoff);}
function frozenSnapshot(config){
  const c=config&&typeof config==='object'?config:{};
  const fire=c.ci1WallCloneFire||c.crystalWallFire||c.justiceArrowFire||c.athenaFire||{};
  const evidence=fire.decisionEvidence?.ci1WallClone||fire.decisionEvidence?.crystalWall||fire.decisionEvidence?.justiceArrow||c.crystalWall||c.justiceArrow||c.decisionEvidence?.ci1WallClone||{};
  const snap={
    release:c.release||c.sourceRelease||fire.sourceRelease||null,
    executionBuild:c.executionBuild||null,
    resetTimestampMs:num(c.resetTimestampMs),
    stakeCents:num(c.stakeCents??c.configuredStakeCents??fire.stakeCents),
    multiply:num(c.multiply),
    minEntryCents:num(c.operatorMinEntryCents??c.minEntryCents??c.hunter?.minEntryCents??c.model?.minEntryCents??fire.operatorMinEntryCents??evidence.minEntryCents),
    maxEntryCents:num(c.operatorMaxEntryCents??c.maxEntryCents??c.hunter?.maxEntryCents??c.model?.maxEntryCents??fire.operatorMaxEntryCents??evidence.maxEntryCents),
    crashCents:num(c.minCrashCents??evidence.minCrashCents),
    reboundCents:num(c.minReboundCents??evidence.minReboundCents),
    upwardTicks:num(c.minUpwardTicks??evidence.minUpwardTicks),
    profitAuthority:c.profitAuthority||c.exitAuthority||null,
    profitTargetCents:num(c.minProfitNetPerOriginalContractCents??c.athenaExit?.minimumProfitNetPerOriginalContractCents??c.infinityBreak?.minimumNetPerOriginalContractCents??c.economicTarget?.netPerOriginalContractCents),
    auroraDamageControlPercent:num(c.auroraDamageControlPercent),
    lightningContinuation:c.lightningPlasmaScaleIn?{...c.lightningPlasmaScaleIn}:null,
    crashEpisodeId:c.crashEpisodeId||c.crashRecoverySource?.crashEpisodeId||evidence.crashEpisodeId||null,
    lastBidCents:num(evidence.lastBidCents??c.lastBidCents),
    cloneGroupId:c.cloneGroupId||c.parentEntryId||c.sourceTradeId||null,
  };
  const gaps=[];
  for(const k of ['stakeCents','minEntryCents','maxEntryCents','profitAuthority','profitTargetCents'])if(snap[k]==null)gaps.push(`frozen_${k}_not_recorded`);
  const id=sha256(JSON.stringify(snap)).slice(0,16);
  return {id,snap,gaps};
}
export function projectLedgerRecord(row,snapshotCutoffMs){
  const config=row.entryConfig||{};
  const frozen=frozenSnapshot(config);
  const opened=num(row.openedAtMs)||0;
  const closed=num(row.closedAtMs);
  const atSnapshot=!(snapshotCutoffMs>0)||opened<=snapshotCutoffMs;
  const closedInSnapshot=closed!=null&&(!(snapshotCutoffMs>0)||closed<=snapshotCutoffMs)&&String(row.status)==='closed';
  const valuationAfterCutoff=cutoffAfter(row.updatedAtMs,snapshotCutoffMs);
  const closedAfterCutoff=String(row.status)==='closed'&&!closedInSnapshot;
  const capital=PORTFOLIO_CONCEPTS.has(row.conceptName)&&!isShadowSaintEntry(row);
  const actualExposure=actualOpenExposure(row);
  const historyUnknown=valuationAfterCutoff||closedAfterCutoff;
  const fees=historyUnknown?null:(num(row.entryFeeCents)||0)+(num(row.exitFeeCents)||0);
  const realized=historyUnknown?null:(num(row.pnlCents)||0);
  const mark=row.reportValuation||null;
  const unrealized=closedInSnapshot?0:historyUnknown?null:capital
    ?actualExposure?(mark?.complete===true?num(mark.unrealizedCents):null):0
    :(num(row.pnlCents)||0);
  const qty=num(row.count)||0;
  const gaps=[...frozen.gaps];
  if(historyUnknown)gaps.push('historical_economic_state_at_cutoff_not_recorded');
  if(capital&&actualExposure&&!closedInSnapshot&&unrealized==null)gaps.push('current_executable_mark_unavailable');
  if(row.peakPriceCents==null)gaps.push('peak_not_recorded');
  if(!row.exitAttemptBookMs)gaps.push('exit_quote_age_not_recorded');
  if(!Array.isArray(config.peakObservations))gaps.push('peak_path_not_retained');
  return {
    positionId:String(row.id),
    executionIds:{entryOrderId:row.entryOrderId||null,entryClientOrderId:row.entryClientOrderId||null,exitOrderId:closedInSnapshot?row.exitOrderId||null:null,exitClientOrderId:closedInSnapshot?row.exitClientOrderId||null:null},
    parentEntryId:config.parentEntryId||row.sourceTradeId||null,
    cloneGroupId:frozen.snap.cloneGroupId||row.sourceTradeId||String(row.id),
    lightningContinuation:config.lightningPlasmaScaleIn?{...config.lightningPlasmaScaleIn}:null,
    crashEpisodeId:frozen.snap.crashEpisodeId,
    ticker:row.ticker,eventTicker:row.eventTicker,side:'YES',marketFamily:String(row.ticker||'').split('-')[0]||null,
    attack:row.conceptName,systemName:row.systemName,ownerId:row.ownerId||null,mode:row.mode,
    executionClass:isShadowSaintEntry(row)?'SHADOW_SAINT':(PORTFOLIO_CONCEPTS.has(row.conceptName)?'CAPITAL':'COSMOS_REFERENCE'),
    shadowProtocol:config.shadowSaint?.version||null,shadowEntryHash:row.shadowEntryHash||null,
    shadowRevision:row.shadowRevision??null,shadowEpoch:row.shadowEpoch??null,
    shadowStopProofHash:config.starlightRecovery?.shadowProofHash||null,
    status:closedInSnapshot?'closed':closedAfterCutoff?'unknown_at_cutoff':row.status,
    capitalPositionConfirmed:capital?(closedInSnapshot?qty>0:historyUnknown?null:actualExposure):null,
    economicStateComplete:!historyUnknown,reportingVersion:EXECUTION_REPORT_VERSION,
    openedAtMs:opened,closedAtMs:closedInSnapshot?closed:null,
    entryPriceCents:num(row.entryPriceCents),exitPriceCents:closedInSnapshot?num(row.exitPriceCents):null,
    quantity:qty,remainingQuantity:historyUnknown?null:num(row.remainingCount),exitFilledQuantity:historyUnknown?null:num(row.exitFilledCount),
    feesCents:fees,realizedNetCents:realized,unrealizedNetCents:unrealized,
    exitReason:closedInSnapshot?row.closeReason||null:null,
    valuation:capital?{priceCents:historyUnknown?null:mark?.priceCents??null,atMs:historyUnknown?null:mark?.atMs??null,source:mark?.source||'unavailable',complete:unrealized!=null,reason:historyUnknown?'historical_economic_state_at_cutoff_not_recorded':mark?.reason||null}:{priceCents:valuationAfterCutoff?null:num(row.currentPriceCents),atMs:valuationAfterCutoff?null:num(row.updatedAtMs),source:'virtual_reference_stored_mark'},
    snapshotId:frozen.id,
    admissionEvidence:config.durableEventAdmission||null,
    starlightBandDecision:config.starlightRecovery?.priceBandDecision||null,
    observations:{peakPriceCents:num(row.peakPriceCents),troughPriceCents:num(row.lowestPriceAfterEntryCents),priceBasis:'stored_column_not_executable_proof',maeCents:num(row.maeCents)},
    exitEvidence:{quoteAgeMs:num(row.exitAttemptBookMs),executableFullPositionNet:null,reason:closedInSnapshot?row.closeReason||null:null,note:'A stored peak is not proof a full-position exit was executable.'},
    gaps,includedInSnapshot:atSnapshot,
  };
}
export function reconcileLedger(records){
  const attacks={};
  let nonPositions=0,pending=0,open=0,closed=0,wins=0,losses=0,breakeven=0,gains=0,lossesAbs=0,fees=0,realized=0,unrealized=0,contracts=0;
  let unrealizedComplete=true,realizedComplete=true,economicStateComplete=true,feesComplete=true;
  const groups=new Set(),events=new Set();
  for(const r of records){
    const a=attacks[r.attack]||(attacks[r.attack]={open:0,closed:0,pending:0,wins:0,losses:0,breakeven:0,realized:0,unrealized:0,knownRealized:0,knownUnrealized:0,realizedComplete:true,unrealizedComplete:true,feesComplete:true,knownFees:0,fees:0,positions:0});
    a.positions++;
    if(r.economicStateComplete===false){economicStateComplete=false;realizedComplete=false;unrealizedComplete=false;feesComplete=false;a.realizedComplete=false;a.unrealizedComplete=false;a.feesComplete=false;}
    const isClosed=r.status==='closed'&&Number(r.quantity)>0;
    const openStatus=['open','entry_pending','exit_pending','pending_recovery'].includes(r.status);
    const isOpen=openStatus&&(r.executionClass==='CAPITAL'?r.capitalPositionConfirmed===true:Number(r.remainingQuantity??r.quantity)>0);
    if(!isClosed&&!isOpen){nonPositions++;if(r.status==='entry_pending'){pending++;a.pending++;}if(r.status==='unknown_at_cutoff'){unrealizedComplete=false;a.unrealizedComplete=false;}continue;}
    contracts+=Number(r.quantity)||0;fees+=Number(r.feesCents)||0;a.knownFees+=Number(r.feesCents)||0;if(r.feesCents==null){feesComplete=false;a.feesComplete=false;}
    groups.add(r.cloneGroupId||r.positionId);events.add(`${r.eventTicker}|${r.attack}`);
    if(r.realizedNetCents==null){realizedComplete=false;a.realizedComplete=false;}
    else {realized+=Number(r.realizedNetCents);a.knownRealized+=Number(r.realizedNetCents);}
    if(isClosed){closed++;a.closed++;
      if(r.realizedNetCents>0){wins++;a.wins++;gains+=r.realizedNetCents;}
      else if(r.realizedNetCents<0){losses++;a.losses++;lossesAbs+=Math.abs(r.realizedNetCents);}
      else if(r.realizedNetCents===0){breakeven++;a.breakeven++;}
    }else{open++;a.open++;
      if(r.unrealizedNetCents==null){unrealizedComplete=false;a.unrealizedComplete=false;}
      else{unrealized+=Number(r.unrealizedNetCents);a.knownUnrealized+=Number(r.unrealizedNetCents);}
    }
  }
  for(const a of Object.values(attacks)){a.fees=a.feesComplete?a.knownFees:null;a.realized=a.realizedComplete?a.knownRealized:null;a.unrealized=a.unrealizedComplete?a.knownUnrealized:null;}
  return {nonPositions,pending,economicStateComplete,realizedComplete,unrealizedComplete,feesComplete,open,closed,wins,losses,breakeven,
    grossGainsCents:gains,grossLossesCents:lossesAbs,feesCents:feesComplete?fees:null,knownFeesCents:fees,
    realizedCents:realizedComplete?realized:null,knownRealizedCents:realized,
    unrealizedCents:unrealizedComplete?unrealized:null,knownUnrealizedCents:unrealized,
    combinedCents:unrealizedComplete&&realizedComplete?realized+unrealized:null,contracts,
    perContractRealizedCents:realizedComplete?(contracts?realized/contracts:0):null,
    positions:records.length,confirmedPositions:open+closed,cloneGroups:groups.size,marketAttackEvents:events.size,byAttack:attacks,countingRules:EXPORT_COUNTING_RULES};
}

export function compactLedgerExportRecord(row,snapshotCutoffMs){
  // Raw proof/book trees have never been included by this exporter. Project
  // immediately after each DB page, before retaining the resumable job.
  const f=frozenSnapshot(row.entryConfig||{});
  return {memoryProjectionVersion:'OOM1',record:projectLedgerRecord(row,snapshotCutoffMs),frozenId:f.id,frozen:f.snap};
}

export function buildLedgerExportPackage({records,meta,maxBytes=EXPORT_PART_MAX_BYTES}){
  const cap=Math.max(1000,Math.min(EXPORT_PART_MAX_BYTES,Math.floor(Number(maxBytes)||EXPORT_PART_MAX_BYTES)));
  if(cap>=EXPORT_FILE_LIMIT_BYTES)throw new Error('export_cap_must_be_below_1000000');
  const cutoff=Number(meta.snapshotCutoffMs)||0;
  const projected=records.map(r=>r.memoryProjectionVersion==='OOM1'?r.record:projectLedgerRecord(r,cutoff)).filter(r=>r.includedInSnapshot);
  const snaps=new Map();
  for(const raw of records){const f=raw.memoryProjectionVersion==='OOM1'?{id:raw.frozenId,snap:raw.frozen}:frozenSnapshot(raw.entryConfig||{});if(!snaps.has(f.id))snaps.set(f.id,f.snap);}
  const primary=projected.filter(r=>EXECUTION_ATTACKS.includes(r.attack)&&r.executionClass==='CAPITAL'
    &&(!meta.ownerId||r.ownerId===meta.ownerId)&&(!meta.mode||r.mode===meta.mode)
    &&Number(r.openedAtMs)>=Number(meta.resetTimestampMs||0));
  const capital=projected.filter(r=>r.executionClass==='CAPITAL');
  const virtual=projected.filter(r=>r.executionClass==='SHADOW_SAINT');
  const reference=projected.filter(r=>r.executionClass==='COSMOS_REFERENCE');
  const totals={...reconcileLedger(primary),basis:'STARLIGHT_AND_LIGHTNING_CAPITAL_EXECUTION'};
  const strategyBreakdown=Object.fromEntries(EXECUTION_ATTACKS.map(name=>[name,reconcileLedger(primary.filter(r=>r.attack===name))]));
  const accountTotals={...reconcileLedger(capital),basis:'ACCOUNT_CAPITAL_LEDGER_INCLUDING_LEGACY_NOT_BROKER_BALANCE'};
  const virtualTotals={...reconcileLedger(virtual),basis:'VIRTUAL_COUNTERFACTUAL_NOT_ACCOUNT_MONEY'};
  const cosmosTotals={...reconcileLedger(reference),basis:'COSMOS_REFERENCE_ONLY'};
  const expected=Number(meta.expectedCount??projected.length);
  const coverage={expected,exported:projected.length,missing:Math.max(0,expected-projected.length),duplicateIds:[...new Set(projected.map((r)=>r.positionId))].length===projected.length?[]:projected.map((r)=>r.positionId).filter((id,i,a)=>a.indexOf(id)!==i),gaps:[...(meta.gaps||[])]};
  coverage.unexpected=Math.max(0,projected.length-expected);
  if(coverage.unexpected)coverage.gaps.push('exported_count_above_expected');
  if(coverage.missing)coverage.gaps.push('exported_count_below_expected');
  const header={exporterBuild:BUILD_INFO,schemaVersion:LEDGER_EXPORT_SCHEMA,exportId:meta.exportId,systemName:meta.systemName,ownerId:meta.ownerId||null,exportedAtMs:Number(meta.exportedAtMs||cutoff),periodFromMs:Number(meta.periodFromMs||meta.resetTimestampMs||0),periodToMs:Number(meta.periodToMs||cutoff),resetTimestampMs:meta.resetTimestampMs||0,snapshotCutoffMs:cutoff,mode:meta.mode||null,summaryOnly:false};
  const files=[];
  const pack=(name,obj)=>{const text=JSON.stringify(obj);const bytes=Buffer.byteLength(text,'utf8');if(bytes>cap)throw new Error(`export_part_over_cap:${name}:${bytes}`);files.push({name,text,bytes,sha256:sha256(text),records:Array.isArray(obj.records)?obj.records.length:Array.isArray(obj.snapshots)?obj.snapshots.length:0,kind:obj.kind||'json'});};
  const chunks=[];let cur=[];let size=Buffer.byteLength(JSON.stringify({...header,part:1,records:[]}),'utf8');
  for(const rec of projected){
    const piece=Buffer.byteLength(JSON.stringify(rec),'utf8')+1;
    if(cur.length&&size+piece>cap-256){chunks.push(cur);cur=[];size=Buffer.byteLength(JSON.stringify({...header,part:chunks.length+1,records:[]}),'utf8');}
    cur.push(rec);size+=piece;
  }
  if(cur.length||!chunks.length)chunks.push(cur);
  const newest=[...projected].sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0)||String(b.positionId).localeCompare(String(a.positionId)));
  // MW-R25 evidence priority: executable Athena/Starlight entries and exits
  // cannot be displaced by high-volume Pegasus/Dragon/Phoenix shadow rows.
  // Preserve existing package byte limits and disclose omitted rows honestly.
  const executable=newest.filter(r=>r.executionClass==='CAPITAL');
  const shadows=newest.filter(r=>!executable.includes(r));
  const openFirst=[...executable.filter(r=>String(r.status)==='open'),
    ...executable.filter(r=>String(r.status)!=='open'),
    ...shadows.filter(r=>String(r.status)==='open'),
    ...shadows.filter(r=>String(r.status)!=='open')];
  const tradeBudget=700_000;
  const keptTrades=[];let tradeBytes=0;
  for(const rec of openFirst){
    const piece=Buffer.byteLength(JSON.stringify(rec),'utf8')+1;
    if(tradeBytes+piece>tradeBudget)break;
    keptTrades.push(rec);tradeBytes+=piece;
  }
  coverage.tradesOmitted=Math.max(0,projected.length-keptTrades.length);
  const keptIds=new Set(keptTrades.map(r=>r.positionId));
  coverage.executableTradesOmitted=executable.filter(r=>!keptIds.has(r.positionId)).length;
  coverage.shadowTradesOmitted=shadows.filter(r=>!keptIds.has(r.positionId)).length;
  if(coverage.tradesOmitted)coverage.gaps.push('older_trades_omitted_to_keep_download_under_1mb');
  if(coverage.executableTradesOmitted)coverage.gaps.push('executable_trade_history_exceeds_single_export_budget_use_time_windows');
  const tradeChunks=[];let curTrade=[];let tradeSize=Buffer.byteLength(JSON.stringify({...header,part:1,records:[]}),'utf8');
  for(const rec of keptTrades){
    const piece=Buffer.byteLength(JSON.stringify(rec),'utf8')+1;
    if(curTrade.length&&tradeSize+piece>cap-256){tradeChunks.push(curTrade);curTrade=[];tradeSize=Buffer.byteLength(JSON.stringify({...header,part:tradeChunks.length+1,records:[]}),'utf8');}
    curTrade.push(rec);tradeSize+=piece;
  }
  if(curTrade.length||!tradeChunks.length)tradeChunks.push(curTrade);
  tradeChunks.forEach((records,i)=>pack(`trades-${String(i+1).padStart(3,'0')}.json`,{...header,kind:'trades',part:i+1,partCount:tradeChunks.length,partName:`trades-${String(i+1).padStart(3,'0')}.json`,records,omittedOlderTrades:coverage.tradesOmitted}));
  const snapList=[...snaps.entries()].map(([id,snapshot])=>({id,snapshot}));
  // Partition by encoded bytes, never by a percentage of rows. Oversized raw
  // rows are losslessly split into UTF-8/base64 fragments with a whole-row hash.
  const packList=(prefix,key,items,extra={})=>{
    const parts=[];let part=[];
    const overhead=Buffer.byteLength(JSON.stringify({...header,kind:prefix,part:999999,partCount:999999,...extra,[key]:[]}),'utf8');
    let size=overhead;
    for(const item of items){
      const bytes=Buffer.byteLength(JSON.stringify(item),'utf8');
      if(size+bytes+(part.length?1:0)>cap && part.length){parts.push(part);part=[];size=overhead;}
      if(overhead+bytes>cap)throw new Error(`export_record_over_cap:${prefix}`);
      size+=bytes+(part.length?1:0);part.push(item);
    }
    if(part.length||!parts.length)parts.push(part);
    parts.forEach((values,i)=>pack(`${prefix}-${String(i+1).padStart(3,'0')}.json`,{...header,kind:prefix,part:i+1,partCount:parts.length,...extra,[key]:values}));
  };
  packList('snapshots','snapshots',snapList.slice(0,40),{note:'Newest frozen entry extracts only. Older snapshots omitted to keep the download at or under 1 MB.'});
  coverage.rawEvidenceOmitted=true;
  coverage.gaps.push('raw_entry_evidence_omitted_to_keep_download_under_1mb');
  const summary={...header,kind:'diagnostic-summary',summaryOnly:true,completeDataset:'trades-*.json; snapshots-*.json (see coverage for omitted evidence)',coverage,totals,strategyBreakdown,accountTotals,virtualTotals,cosmosTotals,health:meta.health||null,settingsAtExport:meta.settingsAtExport||null,settingsAtExportRole:'current_configuration_not_a_substitute_for_missing_frozen_snapshots',unrecoverable:['peak_path_observations_not_retained','legacy_pre_r25_configuration_change_log_not_retained','executable_full_position_exit_net_not_retained_unless_stored_on_the_row'],dashboardDifference:'Homepage closed table is capped at 60 recent rows. This ledger is every retained row since reset up to the snapshot cutoff.',entryChokeDiagnostics:meta.entryChokeDiagnostics||null,starlightRecovery:meta.starlightRecovery||{available:false,reason:'not_collected'},lightningPlasmaScaleIn:meta.lightningPlasmaScaleIn||{available:false,reason:'not_collected'},lightningContinuation:meta.lightningContinuation||{available:false,reason:'not_collected'},financialSnapshotNote:'Incremental export at a fixed cutoff; rows changed after cutoff explicitly carry unknown historical economics. Missing executable marks are not zero profit.'};
  pack('diagnostic-summary.json',{...summary,part:1,partCount:1,runtime:meta.runtime||null,unavailable:summary.unrecoverable});
  const logBody=projected.map((r)=>[r.positionId,r.ticker,r.attack,r.mode,r.executionClass,r.status,r.entryPriceCents,r.exitPriceCents,r.quantity,r.realizedNetCents,r.exitReason||'-',r.snapshotId,(r.gaps||[]).join(',')].join('|'));
  const logParts=[];let buf=[];
  const stamp=(i,n)=>['=== SAGITTARIUS LEDGER ===',`system=${meta.systemName}`,`export_id=${meta.exportId}`,`exported_at_ms=${header.exportedAtMs}`,`period_from_ms=${header.periodFromMs}`,`period_to_ms=${header.periodToMs}`,`part=${i}`,`part_count=${n}`,`collection_complete=${coverage.missing===0}`,EXPORT_COUNTING_RULES,'columns=position_id|ticker|attack|mode|execution_class|status|entry_cents|exit_cents|quantity|net_cents|reason|snapshot_id|gaps'];
  for(const line of logBody){const trial=[...buf,line].join('\n');if(buf.length&&Buffer.byteLength(stamp(1,1).join('\n')+'\n'+trial,'utf8')>cap-128){logParts.push(buf);buf=[line];}else buf.push(line);}
  if(buf.length||!logParts.length)logParts.push(buf);
  logParts.forEach((lines,i)=>{const name=`trading-log-${String(i+1).padStart(3,'0')}.txt`;const text=[...stamp(i+1,logParts.length),...lines,''].join('\n');files.push({name,text,bytes:Buffer.byteLength(text,'utf8'),sha256:sha256(text),records:lines.length,kind:'trading-log'});});
  const manifest={...header,kind:'manifest',part:1,partCount:1,collectionComplete:coverage.missing===0&&coverage.unexpected===0&&coverage.duplicateIds.length===0&&!coverage.gaps.includes('ledger_page_unavailable_runtime_snapshot_only'),files:files.map((f)=>({name:f.name,bytes:f.bytes,sha256:f.sha256,records:f.records,kind:f.kind})),expectedTotals:totals,strategyBreakdown,accountTotals,virtualTotals,cosmosTotals,coverage,countingRules:EXPORT_COUNTING_RULES};
  const manifestText=JSON.stringify(manifest);
  files.unshift({name:'manifest.json',text:manifestText,bytes:Buffer.byteLength(manifestText,'utf8'),sha256:sha256(manifestText),records:projected.length,kind:'manifest'});
  if(files.some((f)=>f.bytes>=EXPORT_FILE_LIMIT_BYTES||f.bytes>cap))throw new Error('export_part_over_cap');
  const budget=Math.min(900_000,Math.max(50_000,Math.floor(Number(meta.packageMaxBytes)||900_000)));
  const ranked=[...files].sort((a,b)=>{
    const rank=(f)=>f.kind==='manifest'?0:f.kind==='diagnostic-summary'?1:f.name.startsWith('trades-')?2:f.kind==='trading-log'?3:f.kind==='snapshots'?4:9;
    return rank(a)-rank(b);
  });
  const kept=[];let used=0;
  for(const f of ranked){
    if(used+f.bytes>budget)continue;
    kept.push(f);used+=f.bytes;
  }
  if(!kept.some((f)=>f.kind==='manifest')){
    const man=files.find((f)=>f.kind==='manifest');
    if(man)kept.unshift(man);
  }
  const omitted=files.filter((f)=>!kept.includes(f)).map((f)=>f.name);
  if(omitted.length){
    const man=kept.find((f)=>f.kind==='manifest');
    if(man){
      const body=JSON.parse(man.text);
      body.omittedFiles=omitted;
      body.files=kept.filter((f)=>f.kind!=='manifest').map((f)=>({name:f.name,bytes:f.bytes,sha256:f.sha256,records:f.records,kind:f.kind}));
      body.packageBudgetBytes=budget;
      body.packageBytes=kept.reduce((n,f)=>n+f.bytes,0);
      body.coverage={...body.coverage,packageCapped:true,gaps:[...(body.coverage?.gaps||[]),'package_capped_at_1mb_newest_kept']};
      man.text=JSON.stringify(body);man.bytes=Buffer.byteLength(man.text,'utf8');man.sha256=sha256(man.text);
    }
  }
  const zipFiles=kept.map((f)=>({name:f.name,data:Buffer.from(f.text,'utf8')}));
  const zip=zipStore(zipFiles);
  if(zip.length>EXPORT_PACKAGE_MAX_BYTES){
    const essential=kept.filter((f)=>f.kind==='manifest'||f.kind==='diagnostic-summary'||f.name.startsWith('trades-001')||f.name.startsWith('trading-log-001'));
    return {collectionComplete:false,manifest:JSON.parse(essential.find((f)=>f.kind==='manifest')?.text||'{}'),files:essential,zip:zipStore(essential.map((f)=>({name:f.name,data:Buffer.from(f.text,'utf8')}))),packageCapped:true};
  }
  return {collectionComplete:manifest.collectionComplete&&omitted.length===0,manifest:JSON.parse(kept.find((f)=>f.kind==='manifest').text),files:kept,zip,packageCapped:omitted.length>0,packageBytes:zip.length};
}

export async function collectLedgerExport(engine,options={}){
  // Never build a promise tail for repeated downloads. Busy is explicit and
  // retryable; the in-flight collection continues under its original scope.
  if(engine.ledgerExportInFlight)throw new Error('ledger_export_busy_retry_after_current_download');
  const task=collectLedgerExportJob(engine,options);engine.ledgerExportInFlight=task;
  try{return await task;}finally{
    if(engine.ledgerExportInFlight===task)engine.ledgerExportInFlight=null;
    engine.ledgerExportMemory={...(engine.ledgerExportMemory||{}),active:false,
      retainedRows:engine.ledgerExportJob?.rows?.length||0,retainedProjectedBytes:engine.ledgerExportJob?.rowsBytes||0};
  }
}

async function collectLedgerExportJob(engine,{budgetMs=15000,pageLimit=80,maxPages=100,pressureAtRequest=false,fromMs=0,toMs=0}={}){
  const contextKey=()=>JSON.stringify([engine.settings?.systemName,engine.settings?.ownerId,engine.settings?.mode,engine.settings?.resetTimestampMs||0,fromMs,toMs]);
  const key=contextKey();
  const existing=engine.ledgerExportJob?.status==='partial'&&engine.ledgerExportJob.contextKey===key?engine.ledgerExportJob:null;
  const settings=existing?.settings||structuredClone(engine.settings||{});
  const cutoff=existing?.snapshotCutoffMs||Date.now();
  const reset=Number(settings.resetTimestampMs)||0;
  const mode=settings.mode||null;
  const exportId=existing?.exportId||`exp-${cutoff}`;
  const rows=Array.isArray(existing?.rows)?[...existing.rows]:[];
  let rowsBytes=Number(existing?.rowsBytes||0);
  engine.ledgerExportMemory={active:true,retainedRows:rows.length,retainedProjectedBytes:rowsBytes,maximumProjectedBytes:LEDGER_EXPORT_MEMORY_MAX_BYTES};
  // Compact market observations at the export cutoff, not prices obtained after
  // a later page/resume. A missing observation produces an explicit data gap.
  const quoteSnapshot=existing?.quoteSnapshot||new Map();
  if(!existing){for(const [ticker,q] of (engine.market?.quotes||new Map())){
    if(quoteSnapshot.size>=8192)break;
    if(q)quoteSnapshot.set(ticker,{ticker:q.ticker,status:q.status,result:q.result,yesBid:q.yesBid,yesAsk:q.yesAsk,quoteAtMs:q.quoteAtMs,updatedAtMs:q.updatedAtMs,bookInvalid:q.bookInvalid});
  }}
  let cursor=existing?.cursor||{afterOpenedAtMs:0,afterId:''};
  let expected=existing?.expected??null;
  const started=Date.now();
  const limit=Math.max(1,Math.min(100,Math.floor(Number(pageLimit)||80)));
  let pages=0;
  while(pages<Math.max(1,Number(maxPages)||1)&&Date.now()-started<Math.max(1,Number(budgetMs)||1)){
    pages+=1;
    const page=typeof engine.db?.ledgerExportPage==='function'?await engine.db.ledgerExportPage(settings.systemName,{limit,afterOpenedAtMs:cursor.afterOpenedAtMs,afterId:cursor.afterId,resetTimestampMs:reset,mode,ownerId:settings.ownerId,fromMs,toMs,snapshotCutoffMs:cutoff}):[];
    if(expected==null&&typeof engine.db?.ledgerExportCount==='function')expected=await engine.db.ledgerExportCount(settings.systemName,{resetTimestampMs:reset,mode,ownerId:settings.ownerId,fromMs,toMs,snapshotCutoffMs:cutoff});
    if(contextKey()!==key){engine.ledgerExportJob=null;throw new Error('export_context_changed_retry');}
    if(!page.length){cursor=null;break;}
    for(const row of page){
      if(PORTFOLIO_CONCEPTS.has(row.conceptName)&&!isShadowSaintEntry(row))row.reportValuation=executionValuation(row,quoteSnapshot.get(row.ticker)||null,settings,cutoff);
    }
    for(const row of page){
      const compact=compactLedgerExportRecord(row,cutoff),bytes=Buffer.byteLength(JSON.stringify(compact),'utf8');
      if(rowsBytes+bytes>LEDGER_EXPORT_MEMORY_MAX_BYTES){
        // Fail clearly; never return misleading complete totals or delete DB
        // records. Existing fromMs/toMs windows can export the same history.
        engine.ledgerExportJob=null;
        throw new Error('ledger_export_memory_window_too_large_use_smaller_fromMs_toMs');
      }
      rows.push(compact);rowsBytes+=bytes;
    }
    engine.ledgerExportMemory={active:true,retainedRows:rows.length,retainedProjectedBytes:rowsBytes,maximumProjectedBytes:LEDGER_EXPORT_MEMORY_MAX_BYTES};
    const last=page[page.length-1];cursor={afterOpenedAtMs:Number(last.openedAtMs)||0,afterId:String(last.id)};
    if(page.length<limit){cursor=null;break;}
    await new Promise((resolve)=>setImmediate(resolve));
  }
  const incomplete=Boolean(cursor);
  const gaps=[];
  if(pressureAtRequest)gaps.push('collected_while_resource_pressure');
  if(incomplete)gaps.push('page_budget_exhausted_retry_download');
  let durableStarlight={available:false,reason:'starlight_store_not_supported'};
  try{
    if(typeof engine.db?.starlightExportSnapshot==='function')durableStarlight=await engine.db.starlightExportSnapshot({
      systemName:settings.systemName,ownerId:settings.ownerId,mode,resetEpoch:reset,
    },{limit:128});
  }catch(error){durableStarlight={available:false,reason:'starlight_store_unavailable',error:String(error?.message||error).slice(0,240)};}
  const starlightRecovery={runtime:engine.starlightRecoveryDiagnostics?.(32)||null,durable:durableStarlight};
  let lightningContinuation={available:false,reason:'not_supported'};
  try{if(typeof engine.db?.lightningContinuationDiagnostic==='function')lightningContinuation={available:true,...await engine.db.lightningContinuationDiagnostic(settings,{limit:32})};}catch(error){lightningContinuation={available:false,reason:String(error?.message||error).slice(0,240)};}
  const built=buildLedgerExportPackage({records:rows,meta:{starlightRecovery,lightningContinuation,lightningPlasmaScaleIn:engine.lightningPlasmaScaleInRuntime?.()||null,exportId,systemName:settings.systemName,ownerId:settings.ownerId,resetTimestampMs:reset,snapshotCutoffMs:cutoff,mode,expectedCount:incomplete?Math.max(rows.length+1,Number(expected)||0):expected??rows.length,health:engine.health||null,exportedAtMs:cutoff,periodFromMs:fromMs||reset,periodToMs:toMs||cutoff,settingsAtExport:settings,runtime:{health:engine.health||null,pressure:engine.resourcePressureState||null},entryChokeDiagnostics:{
      entryAdmission:engine.entryAdmissionSnapshot?.()||null,
      candidateFunnel:(()=>{const f=engine.entryCandidateFunnelSummary?.()||null;return f?{...f,recent:(f.recent||[]).slice(0,24)}:null;})(),
      entryPipeline:(()=>{const p=engine.strategy?.entryPipelineSummary?.()||null;return p?{...p,recent:(p.recent||[]).slice(0,24)}:null;})(),
      boltFilters:engine.atomicThunderBolt?.chokeDiagnosticSummary?.()||null,
    },gaps}});
  engine.ledgerExportJob=incomplete?{status:'partial',exportId,snapshotCutoffMs:cutoff,cursor,rows,rowsBytes,expected,contextKey:key,settings,quoteSnapshot}:{status:'complete',exportId,snapshotCutoffMs:cutoff};
  return {built,incomplete,cursor:engine.ledgerExportJob.cursor||null,exportId};
}

export function ledgerExportIncomplete(engine,reason){
  return {collectionComplete:false,status:'queued',reason,exportId:engine?.ledgerExportJob?.exportId||null,retry:'GET /api/diagnostics/download'};
}


function deadline(promise,timeoutMs,label){
  const ms=Math.max(1,Math.floor(Number(timeoutMs)||1));
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(`${label}_timeout_after_${ms}ms`)),ms);
  });
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}

function runtimeOnlyIncidentDiagnostic(engine,error){
  const settings=engine?.settings&&typeof engine.settings==='object'?structuredClone(engine.settings):{};
  const health=engine?.health&&typeof engine.health==='object'?structuredClone(engine.health):{};
  const entryQueue=engine?.entryEvaluationQueue?.snapshot?.()||null;
  const protectionQueue=engine?.quoteProtectionQueue?.snapshot?.()||null;
  let entryPipeline=null,resourceUsage=null;
  try{entryPipeline=engine?.strategy?.entryPipelineSummary?.()||null;}catch{}
  try{resourceUsage=engine?.resourceUsageSnapshot?.()||null;}catch{}
  return {
    settings,health,resourceUsage,
    riskControls:{
      incidentDiagnosticFallback:'RUNTIME_ONLY_NO_DB',
      advisoryLockIsolation:'DEDICATED_LOCK_POOL',
      advisoryLockPoolMaximumConnections:2,
      resourceGovernor:resourceUsage?.version||'RGM5',
      resourceGovernorTradingAuthority:false,
      entryEvaluationBackpressure:entryQueue,
      quoteProtectionBackpressure:protectionQueue,
    },
    entryPipeline,
    incidentRuntime:{
      collectionComplete:false,
      reason:String(error?.message||error||'diagnostic_collection_failed'),
      capturedAtMs:Date.now(),
      lastError:engine?.lastError||health?.lastError||null,
      lastFullScanMs:Number(engine?.lastFullScanMs||0),
      scanRequested:Boolean(engine?.scanRequested),
      running:Boolean(engine?.running),
      protectedTickerCount:Number(engine?.protectedTickers?.size||0),
      recoveryPriorityTickerCount:Number(engine?.recoveryPriorityTickers?.size||0),
      feederPriorityTickerCount:Number(engine?.feederPriorityTickers?.size||0),
      crashPriorityTickerCount:Number(engine?.crashPriorityTickers?.size||0),
    },
    diagnosticExport:{
      version:'DX2',collectionComplete:false,incidentFallback:true,
      fallbackScope:'runtime_only_no_database_queries',
      hardMaximumBytes:DIAGNOSTIC_EXPORT_MAX_BYTES,targetMaximumBytes:DIAGNOSTIC_EXPORT_TARGET_BYTES,
    },
  };
}

export async function collectDiagnosticData(engine,{timeoutMs=DIAGNOSTIC_COLLECTION_TIMEOUT_MS}={}){
  // R54/RGM3: explicit historical diagnostics yield to open-trade safety under
  // memory pressure. Runtime-only incident evidence requires no history fanout.
  if(engine?.resourceResearchDeferred===true)return runtimeOnlyIncidentDiagnostic(engine,new Error('diagnostic_deferred_resource_pressure'));
  try{return await deadline(engine.diagnostics(),timeoutMs,'diagnostic_collection');}
  catch(error){return runtimeOnlyIncidentDiagnostic(engine,error);}
}

export async function collectTradingLogText(engine,{timeoutMs=TRADING_LOG_COLLECTION_TIMEOUT_MS}={}){
  if(engine?.resourceResearchDeferred===true){
    const e=runtimeOnlyIncidentDiagnostic(engine,new Error('trading_log_deferred_resource_pressure'));
    return [
      '=== SAGITTARIUS TRADING LOG EXPORT FALLBACK ===',
      'collection_complete=false',
      'fallback_scope=runtime_only_no_database_queries',
      `reason=${String(e.incidentRuntime.reason).replace(/[\r\n]+/g,' ')}`,
      `captured_at_ms=${e.incidentRuntime.capturedAtMs}`,
      `running=${e.incidentRuntime.running}`,
      `last_error=${String(e.incidentRuntime.lastError||'').replace(/[\r\n]+/g,' ')}`,
      `entry_backpressure=${JSON.stringify(e.riskControls.entryEvaluationBackpressure)}`,
      `protection_backpressure=${JSON.stringify(e.riskControls.quoteProtectionBackpressure)}`,
      `resource_usage=${JSON.stringify(e.resourceUsage||null)}`,
      'Full historical trade rows were deferred because RGM5 is protecting trading memory.',
    ].join('\n');
  }
  try{return await deadline(engine.tradingLogText(),timeoutMs,'trading_log_collection');}
  catch(error){
    const e=runtimeOnlyIncidentDiagnostic(engine,error);
    return [
      '=== SAGITTARIUS TRADING LOG EXPORT FALLBACK ===',
      'collection_complete=false',
      'fallback_scope=runtime_only_no_database_queries',
      `reason=${String(e.incidentRuntime.reason).replace(/[\r\n]+/g,' ')}`,
      `captured_at_ms=${e.incidentRuntime.capturedAtMs}`,
      `running=${e.incidentRuntime.running}`,
      `last_error=${String(e.incidentRuntime.lastError||'').replace(/[\r\n]+/g,' ')}`,
      `entry_backpressure=${JSON.stringify(e.riskControls.entryEvaluationBackpressure)}`,
      `protection_backpressure=${JSON.stringify(e.riskControls.quoteProtectionBackpressure)}`,
      `resource_usage=${JSON.stringify(e.resourceUsage||null)}`,
      'Full historical trade rows were unavailable within the bounded collection window; this file is an incident snapshot, not a complete trading log.',
    ].join('\n');
  }
}

function utf8Prefix(text,maxBytes){
  const value=String(text??'');
  const buf=Buffer.from(value,'utf8');
  if(buf.length<=maxBytes)return value;
  let end=Math.max(0,Math.min(buf.length,maxBytes));
  while(end>0 && end<buf.length && (buf[end]&0xc0)===0x80)end-=1;
  return buf.subarray(0,end).toString('utf8');
}

export function serializeTradingLogDownload(text,maxBytes=TRADING_LOG_EXPORT_MAX_BYTES){
  const hard=Math.min(TRADING_LOG_EXPORT_MAX_BYTES,Math.max(100_000,Math.floor(Number(maxBytes)||TRADING_LOG_EXPORT_MAX_BYTES)));
  const target=Math.min(hard,TRADING_LOG_EXPORT_TARGET_BYTES);
  const source=String(text??'');
  const sourceBytes=Buffer.byteLength(source,'utf8');
  if(sourceBytes<=hard)return{text:source,bytes:sourceBytes,truncated:false,sourceBytes};
  const footer=(kept,omitted)=>`\n=== EXPORT COMPACTED ===\nTLX1 hard cap: ${hard} bytes | source bytes: ${sourceBytes} | kept bytes: ${kept} | omitted bytes: ${omitted}\nOlder/lower-priority detail was omitted to keep this download browser-safe. Open positions and newest records are emitted first.\n`;
  let reserve=Buffer.byteLength(footer(0,sourceBytes),'utf8')+256;
  let prefix=utf8Prefix(source,Math.max(1,Math.min(target,hard-reserve)));
  const newline=prefix.lastIndexOf('\n');
  if(newline>0)prefix=prefix.slice(0,newline);
  let kept=Buffer.byteLength(prefix,'utf8');
  let out=prefix+footer(kept,Math.max(0,sourceBytes-kept));
  let bytes=Buffer.byteLength(out,'utf8');
  if(bytes>hard){
    const fixedFooter=footer(0,sourceBytes);
    prefix=utf8Prefix(prefix,Math.max(1,hard-Buffer.byteLength(fixedFooter,'utf8')-64));
    const nl=prefix.lastIndexOf('\n');if(nl>0)prefix=prefix.slice(0,nl);
    kept=Buffer.byteLength(prefix,'utf8');out=prefix+footer(kept,Math.max(0,sourceBytes-kept));bytes=Buffer.byteLength(out,'utf8');
  }
  if(bytes>hard)throw new Error(`trading_log_export_exceeds_hard_cap:${bytes}:${hard}`);
  return{text:out,bytes,truncated:true,sourceBytes};
}
const diagnosticPath=(o,path)=>path.reduce((v,k)=>v?.[k],o);
function compactDiagnosticValue(value,depth=0){
  if(value==null||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return value.length<=512?value:`${value.slice(0,500)}...[truncated ${value.length-500} chars]`;
  if(depth>=5)return Array.isArray(value)?`[array ${value.length} items]`:'[object compacted]';
  if(Array.isArray(value))return value.slice(0,50).map((x)=>compactDiagnosticValue(x,depth+1));
  if(typeof value==='object'){const out={};for(const [k,v] of Object.entries(value).slice(0,80))out[k]=compactDiagnosticValue(v,depth+1);return out;}
  return String(value).slice(0,512);
}
const trimDiagnosticArray=(d,path,keep)=>{const a=diagnosticPath(d,path);if(!Array.isArray(a)||a.length<=keep)return null;const before=a.length;a.length=keep;return {section:path.join('.'),available:before,included:keep,omitted:before-keep};};
export function serializeDiagnosticDownload(data,maxBytes=DIAGNOSTIC_EXPORT_MAX_BYTES){
  const hard=Math.min(DIAGNOSTIC_EXPORT_MAX_BYTES,Math.max(100_000,Math.floor(Number(maxBytes)||DIAGNOSTIC_EXPORT_MAX_BYTES)));
  const target=Math.min(hard,DIAGNOSTIC_EXPORT_TARGET_BYTES);
  let d=structuredClone(data||{});
  d.diagnosticExport={...(d.diagnosticExport||{}),version:'DX2',hardMaximumBytes:hard,targetMaximumBytes:target,serialization:'compact_json',hardCapEnforced:true,truncatedSections:[]};
  const encode=()=>JSON.stringify(d);
  let text=encode(),bytes=Buffer.byteLength(text,'utf8');
  const plan=[
    [['feederSignalIntelligence','records'],300],
    [['snapshots'],150],
    [['crashEpisodes'],250],
    [['patterns'],250],
    [['trackedMarkets'],250],
    [['liveMarkets'],75],
    [['openFeeders'],150],
    [['audit'],40],
    [['sports'],75],
    [['closedHunters'],150],
    [['crashLearning','states'],150],
    [['feederSignalIntelligence','records'],100],
  ];
  for(const [path,minimum] of plan){
    const a=diagnosticPath(d,path);if(!Array.isArray(a))continue;
    while(bytes>target&&a.length>minimum){const next=Math.max(minimum,Math.floor(a.length*0.7));const meta=trimDiagnosticArray(d,path,next);if(meta){const prev=d.diagnosticExport.truncatedSections.find((x)=>x.section===meta.section);if(prev){prev.included=meta.included;prev.omitted=prev.available-meta.included;}else d.diagnosticExport.truncatedSections.push(meta);}text=encode();bytes=Buffer.byteLength(text,'utf8');}
  }
  if(bytes>hard){
    const fsi=d.feederSignalIntelligence||{};
    const essential={
      settings:d.settings,riskControls:d.riskControls,health:d.health,resourceUsage:d.resourceUsage,balance:d.balance,brokerContext:d.brokerContext,
      performance:d.performance,conceptStats:d.conceptStats,feederSummary:d.feederSummary,goldenPipeline:d.goldenPipeline,goldenFeedSummary:d.goldenFeedSummary,
      entryPipeline:d.entryPipeline,entryCandidateFunnel:d.entryCandidateFunnel,entryPathConfiguration:d.entryPathConfiguration,openHunters:d.openHunters,closedHunters:Array.isArray(d.closedHunters)?d.closedHunters.slice(0,100):[],
      trackerSummary:d.trackerSummary,recoveryTracking:d.recoveryTracking,profitLearning:d.profitLearning,stopGuardRecoveryLearning:d.stopGuardRecoveryLearning,
      athena:d.athena,goldenEye:d.goldenEye,scanner:d.scanner,audit:Array.isArray(d.audit)?d.audit.slice(0,25):[],
      feederSignalIntelligence:{version:fsi.version,role:fsi.role,executionAuthority:fsi.executionAuthority,entryAuthority:fsi.entryAuthority,athenaDecisionAuthority:fsi.athenaDecisionAuthority,analysisStakeCents:fsi.analysisStakeCents,referenceProfitThresholdsCents:fsi.referenceProfitThresholdsCents,horizonMs:fsi.horizonMs,summary:fsi.summary,records:[],recordsAvailable:fsi.recordsAvailable||0,recordsIncluded:0,recordsOmitted:fsi.recordsAvailable||0,recordsCompact:true,rawObservationsIncluded:false},
      diagnosticExport:{...(d.diagnosticExport||{}),version:'DX2',essentialFallback:true,truncatedSections:[...(d.diagnosticExport?.truncatedSections||[]),{section:'diagnostic_export',reason:'hard_cap_essential_fallback'}]},
    };
    d=essential;text=JSON.stringify(d);bytes=Buffer.byteLength(text,'utf8');
  }
  if(bytes>hard){
    d=compactDiagnosticValue({settings:d.settings,riskControls:d.riskControls,health:d.health,resourceUsage:d.resourceUsage,balance:d.balance,brokerContext:d.brokerContext,performance:d.performance,conceptStats:d.conceptStats,feederSummary:d.feederSummary,entryPipeline:d.entryPipeline,entryCandidateFunnel:d.entryCandidateFunnel,entryPathConfiguration:d.entryPathConfiguration,auroraExecution:d.auroraExecution,atomicThunderBolt:d.atomicThunderBolt,infinityBreak:d.infinityBreak,legacyAtomicThunder:d.legacyAtomicThunder,openHunters:Array.isArray(d.openHunters)?d.openHunters.slice(0,50):[],stopGuardRecoveryLearning:d.stopGuardRecoveryLearning,profitLearning:d.profitLearning,athena:d.athena,goldenEye:d.goldenEye,scanner:d.scanner,audit:Array.isArray(d.audit)?d.audit.slice(0,10):[],diagnosticExport:{version:'DX2',hardMaximumBytes:hard,targetMaximumBytes:target,serialization:'compact_json',hardCapEnforced:true,emergencyMinimalFallback:true,priority:'safety_runtime_open_positions_profit_loss_authorities_then_recent_research'}});
    text=JSON.stringify(d);bytes=Buffer.byteLength(text,'utf8');
  }
  if(bytes>hard){
    d=compactDiagnosticValue({settings:d.settings,riskControls:d.riskControls,health:d.health,resourceUsage:d.resourceUsage,performance:d.performance,openHunters:Array.isArray(d.openHunters)?d.openHunters.slice(0,25):[],auroraExecution:d.auroraExecution,atomicThunderBolt:d.atomicThunderBolt,infinityBreak:d.infinityBreak,legacyAtomicThunder:d.legacyAtomicThunder,entryPipeline:d.entryPipeline,entryCandidateFunnel:d.entryCandidateFunnel,stopGuardRecoveryLearning:d.stopGuardRecoveryLearning,scanner:d.scanner,diagnosticExport:{version:'DX2',hardMaximumBytes:hard,targetMaximumBytes:target,serialization:'compact_json',hardCapEnforced:true,ultraMinimalFallback:true,priority:'open_positions_and_safety_authorities'}});
    text=JSON.stringify(d);bytes=Buffer.byteLength(text,'utf8');
  }
  if(bytes>hard)throw new Error(`diagnostic_export_exceeds_hard_cap:${bytes}:${hard}`);
  for(let i=0;i<3;i+=1){d.diagnosticExport.actualBytes=bytes;text=JSON.stringify(d);const next=Buffer.byteLength(text,'utf8');if(next===bytes){bytes=next;break;}bytes=next;}
  if(bytes>hard){delete d.diagnosticExport.actualBytes;text=JSON.stringify(d);bytes=Buffer.byteLength(text,'utf8');}
  return {text,bytes,data:d};
}
const bootView=(runtime)=>({
  status:runtime.boot?.status||'unknown',
  startedAtMs:runtime.boot?.startedAtMs||0,
  lastAttemptMs:runtime.boot?.lastAttemptMs||0,
  attempts:runtime.boot?.attempts||0,
  lastError:runtime.boot?.lastError||null,
});

export function startServer(runtime,port,rootDir){const clients=new Set(),blockedClients=new WeakSet();let pushing=false,lastPushAtMs=0;const push=async()=>{const engine=runtime.engine;if(pushing||!clients.size||!engine)return;const pressure=String(engine.resourcePressureState||'GREEN');const cadence=['PRESSURE','TRADE_PRIORITY','HARD_RESEARCH_SHED'].includes(pressure)?5000:pressure==='COMPACT'?3000:2000;const now=Date.now();if(now-lastPushAtMs<cadence)return;pushing=true;try{const state=await engine.state();lastPushAtMs=Date.now();const serializeStartedAt=Date.now();const payload=JSON.stringify(state);const serializeMs=Math.max(0,Date.now()-serializeStartedAt);engine.recordOperatorPayload?.({bytes:Buffer.byteLength(payload,'utf8'),serializeMs,sse:true});const msg=`data: ${payload}\n\n`;for(const r of clients){if(blockedClients.has(r))continue;const accepted=r.write(msg);if(accepted===false){blockedClients.add(r);r.once('drain',()=>blockedClients.delete(r));}}}catch{}finally{pushing=false;}};const timer=setInterval(push,1000);
  const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const engine=runtime.engine;
    // Railway uses /health strictly as container liveness. Trading readiness is
    // intentionally separate so a slow Kalshi websocket or database retry can
    // never make Railway kill an otherwise healthy HTTP process.
    if(u.pathname==='/health')return json(res,200,{ok:true,processAlive:true,build:BUILD_INFO,boot:bootView(runtime),engineReady:Boolean(engine),tradingReady:Boolean(engine&&!engine.health.degraded)});
    if(u.pathname==='/ready'){if(!engine)return json(res,503,{ok:false,ready:false,boot:bootView(runtime)});engine.recomputeHealth();const h=engine.health;return json(res,h.degraded?503:200,{ok:!h.degraded,ready:!h.degraded,restOk:h.restOk,websocketOk:h.websocketOk,websocketFresh:h.websocketFresh,reconciliationOk:h.reconciliationOk,protectionOk:h.protectionOk,protectionFresh:h.protectionFresh,scannerFresh:h.scannerFresh,shadowSchemaReady:h.shadowSchemaReady,shadowWorkerFresh:h.shadowWorkerFresh,shadowWorkerOk:h.shadowWorkerOk,shadowLastError:h.shadowLastError,lastWsMessageMs:h.lastWsMessageMs,lastProtectionMs:h.lastProtectionMs,lastFullScanMs:engine.lastFullScanMs,lastError:h.lastError||null});}
    if(u.pathname==='/api/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});res.write('retry: 2000\n\n');clients.add(res);req.on('close',()=>{clients.delete(res);blockedClients.delete(res);});return;}
    if(u.pathname.startsWith('/api/')&&!engine)return json(res,503,{error:'engine_booting',boot:bootView(runtime)});
    if(u.pathname==='/api/shadow-saints/proof'&&req.method==='GET'){
      const evidence=await engine.shadowProofDiagnostic(u.searchParams.get('parentId'));
      return json(res,evidence?200:404,evidence||{error:'shadow_parent_not_found_in_current_scope'});
    }
    if(u.pathname==='/api/shadow-saints'&&req.method==='GET'){
      const page=await engine.shadowDiagnostics({limit:Number(u.searchParams.get('limit')||100),
        status:u.searchParams.get('status')||null,
        beforeOpenedAtMs:u.searchParams.has('beforeOpenedAtMs')?Number(u.searchParams.get('beforeOpenedAtMs')):undefined,
        beforeId:u.searchParams.get('beforeId')||''});
      return json(res,200,{...page,rows:page.rows.map(e=>engine.compactShadowDiagnostic(e))});
    }
    if(u.pathname==='/api/state'&&req.method==='GET')return json(res,200,await engine.state());
    if(u.pathname==='/api/settings'&&req.method==='PATCH')return json(res,200,await engine.patchSettings(await body(req)));
    if(u.pathname==='/api/mode'&&req.method==='POST'){const b=await body(req);return json(res,200,await engine.setMode(b.mode,b.confirmation||''));}
    if(u.pathname==='/api/engine'&&req.method==='POST'){const b=await body(req);return json(res,200,await engine.setEngine(Boolean(b.active)));}
    if(u.pathname==='/api/run-scan'&&req.method==='POST'){engine.requestScan();return json(res,202,{ok:true,requested:true});}
    if(u.pathname==='/api/reset-defaults'&&req.method==='POST')return json(res,200,await engine.resetOperatorSettingsToFactory());
    if(u.pathname==='/api/reset-dashboard'&&req.method==='POST')return json(res,200,await engine.resetDashboard());
    if(u.pathname==='/api/reset-simulation'&&req.method==='POST')return json(res,200,{archived:await engine.resetSimulation()});
    if(u.pathname==='/api/emergency-exit'&&req.method==='POST')return json(res,200,await engine.emergencyExit(await body(req)));
    if(u.pathname==='/api/manual-cashout'&&req.method==='POST')return json(res,200,await engine.manualCashout(await body(req)));
    if(u.pathname==='/api/credentials'&&req.method==='POST'){const b=await body(req);return json(res,200,await engine.saveCredentials(b.keyId,b.privateKeyPem));}
    if(u.pathname==='/api/test-connection'&&req.method==='POST')return json(res,200,await engine.testConnection());
    if(u.pathname==='/api/diagnostics'&&req.method==='GET')return json(res,200,await collectDiagnosticData(engine));
    if((u.pathname==='/api/diagnostics/download'||u.pathname==='/api/trading-logs/download')&&req.method==='GET'&&typeof engine.db?.ledgerExportPage!=='function'){
      const cutoff=Date.now();
      const built=buildLedgerExportPackage({records:[],meta:{exportId:`exp-${cutoff}`,systemName:engine.settings?.systemName||'SAGITTARIUS',ownerId:engine.settings?.ownerId||null,resetTimestampMs:Number(engine.settings?.resetTimestampMs)||0,snapshotCutoffMs:cutoff,exportedAtMs:cutoff,periodFromMs:Number(engine.settings?.resetTimestampMs)||0,periodToMs:cutoff,mode:engine.settings?.mode||null,expectedCount:0,settingsAtExport:engine.settings||null,runtime:{health:engine.health||null},gaps:['ledger_page_unavailable_runtime_snapshot_only']}});
      res.writeHead(200,{'content-type':'application/zip','content-disposition':'attachment; filename="sagittarius-ledger-incomplete.zip"','content-length':String(built.zip.length),'cache-control':'no-store','x-collection-complete':'false'});
      return res.end(built.zip);
    }
    if((u.pathname==='/api/diagnostics/download'||u.pathname==='/api/trading-logs/download')&&req.method==='GET'){
      const collected=await collectLedgerExport(engine,{pressureAtRequest:engine.resourceResearchDeferred===true,fromMs:Number(u.searchParams.get('fromMs')||0),toMs:Number(u.searchParams.get('toMs')||0)});
      const name=`sagittarius-ledger-${new Date(collected.built.manifest.snapshotCutoffMs).toISOString().replace(/[:.]/g,'-')}.zip`;
      res.writeHead(200,{'content-type':'application/zip','content-disposition':`attachment; filename="${name}"`,'content-length':String(collected.built.zip.length),'cache-control':'no-store','x-collection-complete':String(collected.built.collectionComplete)});
      return res.end(collected.built.zip);
    }
    if(u.pathname==='/api/athena/download'&&req.method==='GET'){const d=engine.athenaBrainDocument();return attachment(res,`SAGITTARIUS-ATHENA-A3-ECONOMIC-SURVIVAL-MEMORY.json`,JSON.stringify(d,null,2),'application/json; charset=utf-8');}
    if(u.pathname==='/api/athena/install'&&req.method==='POST')return json(res,200,await engine.installAthenaBrain(await body(req)));
    if(u.pathname==='/api/athena/rebuild'&&req.method==='POST')return json(res,200,await engine.rebuildAthenaBrain());
    if(req.method!=='GET')return json(res,404,{error:'not_found'});
    const rel=u.pathname==='/'?'index.html':normalize(u.pathname).replace(/^[/\\]+/,'');if(rel.includes('..'))return json(res,403,{error:'forbidden'});const file=join(rootDir,'public',rel);try{const data=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);}catch{const data=await readFile(join(rootDir,'public','index.html'));res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(data);}
  }catch(e){json(res,500,{error:String(e?.message||e)});}});
  server.listen(port,'0.0.0.0');server.on('close',()=>clearInterval(timer));return server;
}
