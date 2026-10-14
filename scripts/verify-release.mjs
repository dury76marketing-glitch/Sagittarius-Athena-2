#!/usr/bin/env node
/**
 * Native validation and release evidence gate. Never deploys or places orders.
 * This runner refuses dependency loaders and requires a separate, acknowledged
 * disposable PostgreSQL database. Its output is outside the source tree.
 */
import { createHash } from 'node:crypto';
import { createWriteStream, readFileSync, readdirSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url);
export function treeFingerprint(directory=root){
  const hash=createHash('sha256');
  function walk(folder){
    for(const entry of readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(['.git','node_modules'].includes(entry.name))continue;
      const path=join(folder,entry.name);
      if(entry.isSymbolicLink())throw new Error('Release tree may not contain symbolic links');
      if(entry.isDirectory())walk(path);
      else if(entry.isFile())hash.update(relative(directory,path).split(sep).join('/')).update('\0').update(readFileSync(path)).update('\0');
    }
  }
  walk(directory);return hash.digest('hex');
}
export function validateTestEnvironment(env=process.env,execArgs=process.execArgv){
  if(env.NODE_OPTIONS||execArgs.some(arg=>/loader|--import|--require|^-r$/.test(arg)))
    throw new Error('Native certification prohibits NODE_OPTIONS and dependency import/require loaders');
  if(env.SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB!=='1'||!env.SAGITTARIUS_TEST_DATABASE_URL)
    throw new Error('Explicit disposable PostgreSQL URL and SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1 are required');
  const db=new URL(env.SAGITTARIUS_TEST_DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(db.protocol)||db.pathname.length<2)
    throw new Error('Invalid disposable PostgreSQL URL');
  if(env.DATABASE_URL){
    const production=new URL(env.DATABASE_URL);
    if(production.hostname===db.hostname&&(production.port||'5432')===(db.port||'5432')
      &&decodeURIComponent(production.pathname)===decodeURIComponent(db.pathname))
      throw new Error('Integration database must not be the application database, even with different credentials/query parameters');
  }
  return true;
}
export function parseTapSummary(text){
  const result={};
  for(const name of ['tests','pass','fail','cancelled','skipped','todo']){
    const values=[...text.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`,'gm'))];
    if(!values.length)throw new Error(`Incomplete TAP summary: ${name}`);
    result[name]=Number(values.at(-1)[1]);
  }
  if(result.tests<1||result.pass!==result.tests||result.fail||result.cancelled||result.skipped||result.todo)
    throw new Error(`Release regression gate failed: ${JSON.stringify(result)}`);
  return result;
}
export function validateStagingEvidence(evidence,sourceSha256,treeSha256){
  if(evidence.sourceSha256!==sourceSha256||evidence.treeSha256!==treeSha256)
    throw new Error('Staging evidence belongs to a different tested revision');
  if(evidence.isolated!==true||evidence.mode!=='SIMULATION'||evidence.liveArmed!==false)
    throw new Error('Staging must be isolated, SIMULATION, and LIVE-disarmed');
  if(!evidence.reviewedBy||!Number.isFinite(Date.parse(evidence.reviewedAt)))
    throw new Error('A named, dated review of actual staging evidence is required');
  for(const check of ['migrationReadback','restartContinuity','settingsPreserved','shadowStopToStarlight',
    'legacyExposureProtected','dashboardSegregation','boundedResources','zeroParentBrokerMutations']){
    const item=evidence.checks?.[check];
    if(item?.passed!==true||typeof item.log!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256||''))
      throw new Error(`Unverified staging acceptance case: ${check}`);
  }
  return true;
}
function command(executable,args,logFile,env,timeoutMs){
  return new Promise((resolveResult,reject)=>{
    const log=createWriteStream(logFile,{flags:'wx'});
    const child=spawn(executable,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
    let failed=false;
    let forceKill;
    const timer=setTimeout(()=>{failed=true;child.kill('SIGTERM');forceKill=setTimeout(()=>child.kill('SIGKILL'),5_000);},timeoutMs);
    child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
    child.once('error',error=>{clearTimeout(timer);clearTimeout(forceKill);log.end();reject(error);});
    child.once('close',(code,signal)=>{
      clearTimeout(timer);clearTimeout(forceKill);log.end(()=>{
        if(code!==0||failed)reject(new Error(`Validation command failed (${code??signal}); see ${logFile}`));
        else resolveResult({exitCode:code,log:logFile});
      });
    });
  });
}
async function getJson(url,authorization){
  const response=await fetch(url,{headers:authorization?{authorization}:{},signal:AbortSignal.timeout(15_000),redirect:'error'});
  if(!response.ok)throw new Error(`Staging read failed with HTTP ${response.status}`);
  return response.json();
}
export async function main(args=process.argv.slice(2),env=process.env){
  if(!args.every(arg=>arg==='--local-only'))throw new Error('Only --local-only is supported');
  validateTestEnvironment(env);
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node 22 or newer is required by the existing package');
  const output=resolve(env.SAGITTARIUS_VERIFICATION_DIR||join(root,'..',`sagittarius-verification-${Date.now()}`));
  if(output===root||output.startsWith(root+sep))throw new Error('Verification output must be outside the immutable source tree');
  mkdirSync(output,{recursive:true});
  const result={status:'FAIL_NOT_DEPLOYABLE',node:process.version,treeSha256:treeFingerprint(),
    startedAt:new Date().toISOString(),runs:[],limitations:[],neverDeploys:true,neverArmsLive:true};
  const safeEnv={};
  for(const key of ['PATH','HOME','USERPROFILE','SYSTEMROOT','TEMP','TMP','TMPDIR','LANG','TZ'])if(env[key])safeEnv[key]=env[key];
  Object.assign(safeEnv,{NODE_ENV:'test',CI:'1',DATABASE_URL:'postgresql://127.0.0.1:1/sagittarius_no_application_db',
    SAGITTARIUS_TEST_DATABASE_URL:env.SAGITTARIUS_TEST_DATABASE_URL,SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB:'1'});
  try{
    await command(process.platform==='win32'?'npm.cmd':'npm',['ci','--ignore-scripts','--no-audit','--fund=false'],
      join(output,'native-install.log'),safeEnv,180_000);
    for(const name of ['pg','ws']){
      const location=realpathSync(require.resolve(name));
      if(!location.startsWith(realpathSync(join(root,'node_modules'))+sep))throw new Error(`Non-native dependency resolution: ${name}`);
      await import(name);
    }
    await command(process.execPath,['scripts/check.mjs'],join(output,'syntax.log'),safeEnv,120_000);
    const tests=readdirSync(join(root,'tests')).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`tests/${name}`);
    for(let round=1;round<=3;round++){
      if(treeFingerprint()!==result.treeSha256)throw new Error('Source/test tree changed during certification');
      const log=join(output,`native-round-${round}.tap`);
      await command(process.execPath,['--test','--test-reporter=tap',...tests],log,safeEnv,300_000);
      const summary=parseTapSummary(readFileSync(log,'utf8'));
      result.runs.push({round,...summary,log,sha256:createHash('sha256').update(readFileSync(log)).digest('hex')});
    }
    if(treeFingerprint()!==result.treeSha256)throw new Error('Final source/test tree differs from the tested revision');
    const {BUILD_INFO}=await import('../src/authority.mjs');result.sourceSha256=BUILD_INFO.sourceSha256;
    if(args.includes('--local-only')){
      result.status='LOCAL_NATIVE_GATES_PASSED_NOT_PRODUCTION_APPROVAL';
      result.limitations.push('Railway staging and operator deployment authorization remain outstanding.');
    }else{
      if(env.SAGITTARIUS_STAGING_ACK!=='I_CONFIRM_ISOLATED_SIM_STAGING'||!env.SAGITTARIUS_STAGING_URL||!env.SAGITTARIUS_STAGING_EVIDENCE)
        throw new Error('Isolated SIM staging URL, explicit acknowledgment, and reviewed evidence file are required');
      const base=new URL(env.SAGITTARIUS_STAGING_URL);
      if(base.protocol!=='https:'||base.username||base.password)throw new Error('Staging URL must use HTTPS without embedded credentials');
      const evidenceFile=resolve(env.SAGITTARIUS_STAGING_EVIDENCE);
      const evidence=JSON.parse(readFileSync(evidenceFile,'utf8'));
      validateStagingEvidence(evidence,result.sourceSha256,result.treeSha256);
      for(const item of Object.values(evidence.checks)){
        const file=resolve(dirname(evidenceFile),item.log);
        if(createHash('sha256').update(readFileSync(file)).digest('hex')!==item.sha256)throw new Error('Staging evidence log checksum mismatch');
      }
      const [health,ready,state]=await Promise.all(['/health','/ready','/api/state']
        .map(path=>getJson(new URL(path,base),env.SAGITTARIUS_STAGING_AUTHORIZATION)));
      if(health.build?.sourceSha256!==result.sourceSha256||ready.ready!==true
        ||state.settings?.mode!=='SIMULATION'||state.settings?.liveArmed===true)
        throw new Error('Staging live read does not prove the same healthy SIM-only release');
      result.staging={reviewedBy:evidence.reviewedBy,reviewedAt:evidence.reviewedAt,sourceSha256:health.build.sourceSha256,
        ready:true,mode:'SIMULATION',checks:evidence.checks};
      result.status='PASS_ELIGIBLE_FOR_EXPLICIT_OPERATOR_PROMOTION_NOT_AUTO_DEPLOYED';
      result.limitations.push('Staging log content was reviewed by the named operator; this tool verifies identity, checksums and live health, not independent semantic truth of those logs. LIVE activation still requires explicit authorization.');
    }
  }catch(error){result.error=String(error.message||error);throw error;}
  finally{result.finishedAt=new Date().toISOString();writeFileSync(join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(`${result.status}\nEvidence: ${output}`);return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(error=>{console.error(`FAIL - NOT DEPLOYABLE: ${error.message}`);process.exitCode=1;});
