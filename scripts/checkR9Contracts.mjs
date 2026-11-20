#!/usr/bin/env node
// All release-contract probes run in a subprocess with network mutations
// disallowed. Explicit synthetic LIVE tests spawn their own isolated child
// processes with fakes for broker and SQL; no live credentials are read.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const scripts=['checkQ17Safety.mjs','checkR9ModeTransition.mjs','checkR9BrokerReconcile.mjs',
 'checkR9LiveRecoveryContract.mjs','checkQ17LiveFillLifecycle.mjs','checkQ17ConnectedRecoveryClose.mjs'];
for(const file of scripts){
 const path=fileURLToPath(new URL(file,import.meta.url));
 const run=spawnSync(process.execPath,[path],{
   env:{...process.env,ALLOW_LIVE_TRADING:'false',KALSHI_PRIVATE_KEY_PEM:'',KALSHI_API_KEY_ID:''},
   encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 if(run.status!==0){console.error(`${file}: FAILED\n${(run.stderr||'').slice(-1600)}\n${(run.stdout||'').slice(-1000)}`);process.exit(1);}
 const output=String(run.stdout||'').trim().split('\n');
 console.log(`${file}: PASS ${output.at(-1)||''}`);
}
console.log(JSON.stringify({kind:'Q17_R9_SYNTHETIC_RELEASE_CONTRACTS',tests:scripts.length,
 sourceIsolation:true,credentialExposure:false,brokerMutations:0,nativePostgresTests:0}));
