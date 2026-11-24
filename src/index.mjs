import {setTimeout as sleep} from 'node:timers/promises';
import {assertQ17IsolatedDatabase} from './q17Profile.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {env,RELEASE} from './config.mjs';
import {SagittariusEngine} from './engine.mjs';
import {startServer} from './server.mjs';
import {ProcessSentinel} from './operationalWatchdog.mjs';

assertQ17IsolatedDatabase({databaseUrl:env.databaseUrl});
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime={engine:null,bootCandidate:null,sentinel:new ProcessSentinel(),
  boot:{status:'starting',startedAtMs:Date.now(),lastAttemptMs:0,attempts:0,lastError:null,lastErrorStage:null,lastErrorMessage:null}};
let stopping=false,stopPromise=null;
let probeTimer=null;
let r35NativeProbeAtMs=0,r35NativeProbeActive=false;
const r35ProcessStartedAtMs=Date.now();
// R35 acceptance: read-only native PostgreSQL evidence, 2 bounded COUNT
// queries per clone every 5 minutes, on the existing async diagnostic lane.
// No credential values, row IDs, positions or account fields are logged.
function emitR35NativeLedgerProof(engine){
  try{
    const at=Date.now(),pool=engine?.db?.pool,systemName=String(engine?.settings?.systemName||'');
    if(!pool||!systemName||r35NativeProbeActive||at-r35NativeProbeAtMs<5*60_000)return;
    r35NativeProbeAtMs=at;r35NativeProbeActive=true;
    const clocks=`select count(*)::int as total,
      count(*) filter (where state->>'phase'='BOUNDED')::int as bounded,
      count(*) filter (where state->>'phase'='SCHEDULE_LIVE')::int as schedule_live,
      count(*) filter (where state->>'phase'='CONFIRMED')::int as confirmed,
      count(*) filter (where state->>'phase'='LIVE_START_UNKNOWN')::int as live_start_unknown,
      count(*) filter (where state->>'phase'='UNKNOWN')::int as unknown,
      count(*) filter (where state->>'phase'='CONFLICT')::int as conflict,
      count(*) filter (where state->>'phase'='FINAL')::int as final,
      count(*) filter (where state->>'pregameMilestoneId' is not null
        and state->>'pregameMilestoneId' <> '')::int as prior_pregame_evidence
      from sag_game_clock_authority where system_name=$1`;
    const entries=`select count(*) filter (where concept_name like 'R17:%'
        and mode='SIMULATION' and opened_at_ms >= $2)::int as new_sim_saint_entries,
      count(*) filter (where concept_name like 'R17:%' and status='open')::int as currently_open_saints
      from sag_entries where system_name=$1`;
    void Promise.all([
      pool.query({text:clocks,values:[systemName],query_timeout:1500}),
      pool.query({text:entries,values:[systemName,r35ProcessStartedAtMs],query_timeout:1500}),
    ]).then(([c,e])=>{
      console.log(JSON.stringify({event:'sagittarius_r35_native_pg_attestation',atMs:Date.now(),
        clockCounts:c?.rows?.[0]||{},entryCounts:e?.rows?.[0]||{},
        source:'native_postgres_read_only_aggregate',window:'since_this_process_start',
        doesNotProveBrokerFill:true}));
    }).catch(err=>{console.log(JSON.stringify({event:'sagittarius_r35_native_pg_attestation',
      atMs:Date.now(),status:'unavailable',code:String(err?.code||'query_failed').slice(0,20)}));
    }).finally(()=>{r35NativeProbeActive=false;});
  }catch{r35NativeProbeActive=false;}
}
// R30 read-only first-blocker forensics: no network, SQL or trading actions.
// Only aggregate settings/decisions are logged; never credentials, fills or account data.
function logNoTradeProbe(engine){
  try{
    const settings=engine?.settings||{};
    const trace=engine?.r17?.decisionTraceSnapshot?.()||{};
    const rows=[...(engine?.eventClockRuntime?.states?.values?.()||[])];
    const count=(records,key)=>records.reduce((a,r)=>{const value=String(r?.[key]||'missing').slice(0,85);a[value]=(a[value]||0)+1;return a;},{});
    const counted=Object.entries(trace.byStageReason||{}).sort((a,b)=>b[1]-a[1]).slice(0,18);
    const stage=engine?.r17?.stats||{};
    const cards=Object.values(settings.goldenSaints||{});
    console.log(JSON.stringify({event:'sagittarius_r30_read_only_choke_probe',atMs:Date.now(),
      mode:settings.mode,engineActive:settings.engineActive===true,
      minGameMinutes:Number(settings.minGameMinutes||0),maxGameMinutes:Number(settings.maxGameMinutes||0),
      goldenCardsEnabled:cards.filter(x=>x?.enabled===true).length,
      goldenCardCount:cards.length,
      goldenRuntime:{sweeps:stage.sweeps||0,armed:stage.armed||0,opened:stage.opened||0,
        denied:stage.denied||0,executionQueued:stage.executionQueued||0,
        executionCompleted:stage.executionCompleted||0,executionErrors:stage.executionErrors||0,
        activeTickers:engine?.r17?.activeTickers?.size||0,
        decisionTraceCount:trace.totalRetained||0,topStageReasons:counted,
        recentDecisions:(trace.events||[]).slice(-6).map(x=>({stage:x.stage,reason:x.reason,saint:x.saint}))},
      clocks:{inMemory:rows.length,phases:count(rows,'phase'),reasons:count(rows,'reason'),
        lastFive:rows.slice(-5).map(x=>({phase:x.phase,reason:x.reason,
          liveStatus:x.liveStatus,source:x.source,entryAuthorized:x.entryAuthorized,
          pregameObserved:Boolean(x.pregameObservedAtMs),bounded:Boolean(x.boundedStartLowerMs&&x.boundedStartUpperMs),
          milestoneMatched:Boolean(x.milestoneId),evidenceAgeMs:Math.max(0,Date.now()-Number(x.evidenceObservedAtMs||0))}))},
      scanner:{lastFullScanAgeMs:Math.max(0,Date.now()-Number(engine?.lastFullScanMs||0)),
        lastScanMarkets:engine?.lastScanMarkets?.length||0,
        cachedMarketQuotes:engine?.market?.quotes?.size||0,
        pregameScouts:(engine?.lastScanMarkets||[]).filter(x=>x?.clockProbeOnly===true).length,
        marketPregameScoutEvidence:engine?.market?.pregameScoutStats||null},
      evidence:'PROCESS_LOCAL_COUNTERS_NOT_DISTINCT_OPPORTUNITIES_OR_BROKER_FILLS'}));
    emitR35NativeLedgerProof(engine);
  }catch{/* diagnostics must never affect trading */}
}
const server=startServer(runtime,env.port,root);
console.log(`${RELEASE} HTTP listening on port ${env.port}; liveTransportPolicy=${env.allowLiveTrading?'ENABLED':'DISABLED'}`);

async function bootLoop(){
  while(!stopping&&!runtime.engine){
    runtime.boot.status=runtime.boot.attempts?'retrying':'starting';
    runtime.boot.attempts++;runtime.boot.lastAttemptMs=Date.now();
    let candidate;
    try{
      candidate=new SagittariusEngine();runtime.bootCandidate=candidate;
      candidate.operational.sentinel=runtime.sentinel;
      await candidate.init();
      if(stopping||candidate.shuttingDown){await candidate.shutdown();return;}
      runtime.engine=candidate;runtime.bootCandidate=null;runtime.boot.status='running';runtime.boot.lastError=null;runtime.boot.lastErrorStage=null;runtime.boot.lastErrorMessage=null;
      console.log(`SAGITTARIUS engine ready mode=${candidate.settings.mode} liveArmed=${candidate.settings.liveArmed} entries=${candidate.settings.engineActive}`);
      logNoTradeProbe(candidate);
      if(!probeTimer){probeTimer=setInterval(()=>logNoTradeProbe(runtime.engine),30000);probeTimer.unref?.();}
      return;
    }catch(error){
      runtime.boot.lastError=String(error?.code||error?.name||'engine_boot_failed');
      runtime.boot.lastErrorStage=error?.startupStage||(candidate?.db?.startupStage!=='ready'&&candidate?.db?.startupStage)||'engine_initialization';
      const hints={
        '0A000':'PostgreSQL rejected a startup schema operation. Inspect the reported stage and dependency; the engine is not ready.',
        '55P03':'Database startup lock is busy. Startup will retry without bypassing protection.',
        '57014':'Database startup statement exceeded its time limit. Startup will retry.',
        '28P01':'Database connection authentication failed. Check the Railway database connection variable, not an application login.',
        'ECONNREFUSED':'Database connection was refused. Check Railway database availability.'
      };
      runtime.boot.lastErrorMessage=hints[runtime.boot.lastError]||'Engine startup did not complete. Inspect the startup stage and server logs.';
      // Schema dependency diagnostics contain object names, not SQL parameters.
      // Only accept the standard ALTER TYPE error; never log raw connection errors.
      const dependencyMessage=runtime.boot.lastError==='0A000'&&/^cannot alter type of a column used /i.test(String(error?.message||''))
        ?String(error.message).replace(/[\r\n\x00-\x1f]/g,' ').slice(0,240):undefined;
      const dependency=dependencyMessage&&/^(trigger|rule|view|constraint) [A-Za-z0-9_." ]+ depends on column [A-Za-z0-9_." ]+$/i.test(String(error?.detail||''))
        ?String(error.detail).slice(0,240):undefined;
      console.error(JSON.stringify({event:'engine_boot_failed',attempt:runtime.boot.attempts,
        code:runtime.boot.lastError,stage:runtime.boot.lastErrorStage,message:runtime.boot.lastErrorMessage,
        dependencyMessage,dependency}));
      if(candidate)await Promise.race([candidate.shutdown().catch(()=>{}),sleep(25_000)]);
      runtime.bootCandidate=null;
      if(!stopping){runtime.boot.status='retrying';await sleep(Math.min(60_000,5000*runtime.boot.attempts));}
    }
  }
}

function stop(exitCode=0,reason='operator_shutdown'){
  if(stopPromise)return stopPromise;
  stopping=true;runtime.boot.status='stopping';
  if(probeTimer){clearInterval(probeTimer);probeTimer=null;}
  const engine=runtime.engine||runtime.bootCandidate;
  if(engine){engine.operational?.fail(reason);engine.shuttingDown=true;}
  // Shutdown is bounded even if a DB client is stuck. Durable intents are never
  // marked filled/canceled just because this deadline expires.
  const force=setTimeout(()=>{console.error(JSON.stringify({event:'shutdown_deadline',action:'restart_requires_reconciliation'}));process.exit(1);},30_000);
  stopPromise=(async()=>{
    server.endOperatorStreams?.();
    const drained=new Promise(r=>server.close(r));
    const closed=await Promise.race([drained.then(()=>true),sleep(3000).then(()=>false)]);
    if(!closed)server.closeAllConnections?.();
    if(engine)await engine.shutdown().catch(()=>{});
    await runtime.sentinel.stop();clearTimeout(force);process.exit(exitCode);
  })();
  return stopPromise;
}
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
// Never continue trading after an uncaught asynchronous failure. The original
// error payload may contain credentials; log only a bounded classification.
process.on('unhandledRejection',()=>{console.error(JSON.stringify({event:'unhandled_rejection',action:'fail_closed_shutdown'}));void stop(1,'unhandled_rejection');});
process.on('uncaughtException',()=>{console.error(JSON.stringify({event:'uncaught_exception',action:'fail_closed_shutdown'}));void stop(1,'uncaught_exception');});
void bootLoop();
