import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {env} from './config.mjs';
import {SagittariusEngine} from './engine.mjs';
import {startServer} from './server.mjs';
import {ProcessSentinel} from './operationalWatchdog.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime={engine:null,bootCandidate:null,sentinel:new ProcessSentinel(),
  boot:{status:'starting',startedAtMs:Date.now(),lastAttemptMs:0,attempts:0,lastError:null,lastErrorStage:null,lastErrorMessage:null}};
let stopping=false,stopPromise=null;
const server=startServer(runtime,env.port,root);
console.log(`SAGITTARIUS HTTP listening on port ${env.port}`);

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
