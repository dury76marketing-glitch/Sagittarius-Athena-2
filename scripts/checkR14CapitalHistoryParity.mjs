/** R14: original-source capital financial/history parity. No broker requests or writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL, fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const imp=p=>import(pathToFileURL(path.join(root,p)).href);
const {Database}=await imp('src/db.mjs');
const {CAPITAL_SQL}=await imp('src/shadowProtocol.mjs');
const {EXECUTION_ATTACKS,ACTUAL_OPEN_SQL}=await imp('src/executionReporting.mjs');
const source=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
function originalFunction(name){
  const marker=`function ${name}(`;const start=source.indexOf(marker);
  assert.ok(start>=0,'deployed UI function missing: '+name);
  const bodyAt=source.indexOf('{',start+marker.length);
  let depth=0,end=-1,quote=null,comment=null;
  for(let i=bodyAt;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&next==='/'){comment=null;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
    if(c==='/'&&next==='/'){comment='line';i++;continue;}
    if(c==='/'&&next==='*'){comment='block';i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;if(c==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  assert.ok(end>start,'unterminated function '+name);
  return source.slice(start,end);
}
const helpers=['currentDashboardStartMs','financialScopeMatches','dashboardRowIdentityMatches',
  'effectiveDashboardStartMs','dashboardRowScopeMatches','capitalizePageScopeMatches'];
const ui=vm.runInNewContext(`${helpers.map(originalFunction).join('\n')}\n({validate:capitalizePageScopeMatches})`,
  {CAPITAL_HISTORY_VERSION:'CAPITAL-TRADE-HISTORY-V1',CAPITAL_HISTORY_PAGE_SIZE:100,Number,String,Object,Array});
const now=1773000000000,settings={systemName:'SGT-1',ownerId:'owner',mode:'LIVE',resetTimestampMs:now-100000,liveDashboardStartMs:now-100000};
const concepts=[...EXECUTION_ATTACKS];
const dbRow=(concept,status='closed',extra={})=>({id:`${concept}:${status}`,system_name:settings.systemName,
  owner_id:settings.ownerId,mode:settings.mode,concept_name:concept,
  archived:false,status,execution_class:'CAPITAL',entry_config:{executionClass:'CAPITAL',entryFillProof:{authoritative:true,filledCount:1}},
  opened_at_ms:now-10000,closed_at_ms:status==='closed'?now-1000:null,count:1,remaining_count:status==='closed'?0:1,
  pnl_cents:concept==='Crash Recovery Hunter'?5:2,entry_order_id:'ORD1',entry_client_order_id:'CID1',...extra});
function simulatedPgQuery(rows){
  let select='',calls=[],writes=0,commits=0;
  const client={async query(sql,args=[]){const q=String(sql);calls.push(q);
    if(q.startsWith('BEGIN')||q.startsWith('set local'))return {rows:[]};
    if(q==='COMMIT'){commits++;return {rows:[]};}
    if(q==='ROLLBACK')return {rows:[]};
    if(!q.includes('from sag_entries'))throw Error('unexpected DB statement: '+q.slice(0,70));
    select=q;
    const hasStrictCapital=q.includes(`and ${CAPITAL_SQL}`);
    const hasVirtualEscape=q.includes("or (concept_name='Crash Recovery Hunter'");
    const classified=(row)=>{
      const real=row.execution_class!=='SHADOW_SAINT'&&row.entry_config?.executionClass!=='SHADOW_SAINT';
      return (hasStrictCapital&&real)||(!hasStrictCapital&&hasVirtualEscape&&(real||(row.concept_name==='Crash Recovery Hunter'&&(row.execution_class==='SHADOW_SAINT'||row.entry_config?.executionClass==='SHADOW_SAINT'))));
    };
    const [system,owner,mode,start,beforeAt,beforeId,cutoff,requested]=args;
    const closed=q.includes("status='closed' and count>0"),sortAt=r=>closed?(r.closed_at_ms??r.opened_at_ms):r.opened_at_ms;
    const eligible=rows.filter(r=>r.system_name===system&&r.owner_id===owner&&r.mode===mode&&!r.archived
      &&concepts.includes(r.concept_name)&&classified(r)
      &&(closed?(r.status==='closed'&&r.count>0&&r.opened_at_ms>=start):(['open','exit_pending','entry_pending','pending_recovery'].includes(r.status)&&r.remaining_count>0))
      &&sortAt(r)<=cutoff
      &&(beforeAt==null||sortAt(r)<beforeAt||(sortAt(r)===beforeAt&&r.id<beforeId)));
    eligible.sort((a,b)=>sortAt(b)-sortAt(a)||b.id.localeCompare(a.id));
    return {rows:structuredClone(eligible.slice(0,requested))};
  },release(){}};
  const db=Object.create(Database.prototype);db.pool={async connect(){return client}};
  return {db,get sql(){return select},get calls(){return calls},get commits(){return commits},get writes(){return writes}};
}
const virtual=(status='closed',extra={})=>dbRow('Crash Recovery Hunter',status,{
  id:`virtual-${status}`,execution_class:'SHADOW_SAINT',entry_config:{executionClass:'SHADOW_SAINT'},pnl_cents:55,...extra});
const virtualConflicting=dbRow('Crash Recovery Hunter','closed',{
  id:'shadow-conflict',execution_class:'CAPITAL',entry_config:{executionClass:'SHADOW_SAINT'},pnl_cents:77});
const all=[...concepts.map((c,i)=>dbRow(c,'closed',{id:'real-close-'+i})),virtual('closed'),virtualConflicting,
  ...concepts.map((c,i)=>dbRow(c,'open',{id:'real-open-'+i})),virtual('open'),
  dbRow('Crash Recovery Hunter','open',{id:'other-owner',owner_id:'other'})];
const hits=[];const check=async(name,fn)=>{try{await fn();hits.push({name,ok:true});console.log('PASS '+name)}catch(e){hits.push({name,ok:false,error:String(e?.message||e)});console.error('FAIL '+name+': '+String(e?.message||e))}};
const scope={...settings,dashboardStartMs:settings.liveDashboardStartMs};
const pageInput=(status,extra={})=>({ownerId:settings.ownerId,mode:'LIVE',resetTimestampMs:settings.resetTimestampMs,
  dashboardStartMs:settings.liveDashboardStartMs,status,limit:100,snapshotCutoffMs:now,...extra});
await check('R13 original SQL capital-only class is identical to financial aggregate',async()=>{
  const h=simulatedPgQuery(all);await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('closed'));
  assert.ok(h.sql.includes(`and ${CAPITAL_SQL}`),'capital SQL must use exact financial classifier, without virtual exceptions');
  assert.ok(!h.sql.includes("or (concept_name='Crash Recovery Hunter'"),'virtual Starlight SQL escape is forbidden');
  assert.ok(h.sql.includes("status='closed' and count>0"));
  assert.equal(h.commits,1);assert.equal(h.writes,0);
});
await check('Seven-attack closed capital table excludes all virtual Starlight classes',async()=>{
  const h=simulatedPgQuery(all);const page=await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('closed'));
  assert.equal(page.rows.length,7);assert.equal(page.hasMore,false);
  assert.equal(page.rows.reduce((total,r)=>total+r.pnlCents,0),5+6*2);
  assert.ok(page.rows.every(r=>r.executionClass==='CAPITAL'));
  assert.equal(page.scope.ownerId,settings.ownerId);assert.equal(page.scope.mode,'LIVE');
});
await check('Seven-attack open capital table excludes all virtual Starlight classes',async()=>{
  const h=simulatedPgQuery(all);const page=await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('open'));
  assert.equal(page.rows.length,7);assert.ok(page.rows.every(r=>r.executionClass==='CAPITAL'));
  assert.ok(h.sql.includes(ACTUAL_OPEN_SQL));
});
await check('Current-mode UI validator rejects virtual Starlight in closed history',()=>{
  const normal={...scope,settings};
  const page={version:'CAPITAL-TRADE-HISTORY-V1',status:'closed',scope,snapshotCutoffMs:now,hasMore:false,rows:[{
    id:'shadow',conceptName:'Crash Recovery Hunter',systemName:settings.systemName,ownerId:settings.ownerId,
    mode:'LIVE',openedAtMs:now-10000,status:'closed',count:1,executionClass:'SHADOW_SAINT',entryConfig:{executionClass:'SHADOW_SAINT'}}]};
  assert.equal(ui.validate(page,normal,'closed'),false);
});
await check('Current-mode UI validator rejects virtual Starlight in open risk history',()=>{
  const normal={...scope,settings};
  const page={version:'CAPITAL-TRADE-HISTORY-V1',status:'open',scope,snapshotCutoffMs:now,hasMore:false,rows:[{
    id:'shadow',conceptName:'Crash Recovery Hunter',systemName:settings.systemName,ownerId:settings.ownerId,
    mode:'LIVE',openedAtMs:now-10000,status:'open',remainingCount:1,executionClass:'SHADOW_SAINT',
    entryConfig:{executionClass:'SHADOW_SAINT'},positionExposureConfirmed:false}]};
  assert.equal(ui.validate(page,normal,'open'),false);
});
await check('Starlight LIVE open row without verified exposure cannot bypass final UI check',()=>{
  const normal={...scope,settings};
  const page={version:'CAPITAL-TRADE-HISTORY-V1',status:'open',scope,snapshotCutoffMs:now,hasMore:false,rows:[{
    id:'unverified',conceptName:'Crash Recovery Hunter',systemName:settings.systemName,ownerId:settings.ownerId,
    mode:'LIVE',openedAtMs:now-10000,status:'open',remainingCount:1,executionClass:'CAPITAL',entryConfig:{executionClass:'CAPITAL'},positionExposureConfirmed:false}]};
  assert.equal(ui.validate(page,normal,'open'),false);
});
await check('UI admits genuine LIVE capital positions in all seven attacks',()=>{
  for(const status of ['open','closed']){
    const normal={...scope,settings};const rows=concepts.map((c,i)=>({id:'real-'+i,conceptName:c,systemName:settings.systemName,
      ownerId:settings.ownerId,mode:'LIVE',status:status==='open'?'open':'closed',openedAtMs:now-10000,count:1,
      remainingCount:status==='open'?1:0,positionExposureConfirmed:true,executionClass:'CAPITAL',entryConfig:{executionClass:'CAPITAL'}}));
    assert.equal(ui.validate({version:'CAPITAL-TRADE-HISTORY-V1',status,scope,snapshotCutoffMs:now,hasMore:false,rows},normal,status),true,status);
  }
});
await check('UI rejects mixed-mode, owner and reset-scoped pages',()=>{
  const normal={...scope,settings};const page={version:'CAPITAL-TRADE-HISTORY-V1',status:'closed',scope:{...scope,ownerId:'other'},
    snapshotCutoffMs:now,hasMore:false,rows:[]};assert.equal(ui.validate(page,normal,'closed'),false);
});
await check('Closed-history keyset pagination keeps every genuine capital seat',async()=>{
  const h=simulatedPgQuery(all);const first=await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('closed',{limit:3}));
  assert.equal(first.rows.length,3);assert.equal(first.hasMore,true);assert.ok(first.nextCursor);
  const next=await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('closed',{limit:3,...first.nextCursor}));
  assert.equal(next.rows.length,3);assert.equal(next.hasMore,true);
  const last=await h.db.capitalTradeHistoryPage(settings.systemName,pageInput('closed',{limit:3,...next.nextCursor}));
  assert.equal(last.rows.length,1);assert.equal(last.hasMore,false);
  assert.equal(new Set([...first.rows,...next.rows,...last.rows].map(e=>e.id)).size,7);
});
const failed=hits.filter(h=>!h.ok);console.log(JSON.stringify({suite:'R14_CAPITAL_HISTORY_INTEGRATED_PARITY',root,passed:hits.length-failed.length,failed:failed.length,
  nativePostgres:false,brokerOrders:0,sourceRows:all.length,financialScope:'CAPITAL_only',failures:failed.map(x=>x.name)}));
if(failed.length)process.exitCode=1;
