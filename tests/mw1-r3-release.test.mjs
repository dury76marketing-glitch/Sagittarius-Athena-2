import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateTestEnvironment,parseTapSummary,treeFingerprint,validateStagingEvidence } from '../scripts/verify-release.mjs';
const env={SAGITTARIUS_TEST_DATABASE_URL:'postgresql://user:pw@localhost/disposable',SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB:'1'};
test('R3 release gate accepts only explicitly acknowledged isolated native test configuration',()=>{
 assert.equal(validateTestEnvironment(env,[]),true);
 assert.throws(()=>validateTestEnvironment({},[]),/disposable/);
 assert.throws(()=>validateTestEnvironment({...env,NODE_OPTIONS:'--import fake.mjs'},[]),/loader/);
 assert.throws(()=>validateTestEnvironment(env,['--experimental-loader=x']),/loader/);
 assert.throws(()=>validateTestEnvironment({...env,DATABASE_URL:'postgresql://other:credentials@localhost:5432/disposable?ssl=true'},[]),/application database/);
 assert.throws(()=>validateTestEnvironment({...env,SAGITTARIUS_TEST_DATABASE_URL:'https://example.com/test'},[]),/Invalid/);
});
for(const [name,changed] of [['failed',{fail:1,pass:9}],['skipped',{skipped:1,pass:9}],['cancelled',{cancelled:1,pass:9}],['todo',{todo:1,pass:9}],['missing tests',{tests:0,pass:0}]]){
 test(`R3 release gate rejects ${name} regressions`,()=>{
  const counts={tests:10,pass:10,fail:0,skipped:0,cancelled:0,todo:0,...changed};
  assert.throws(()=>parseTapSummary(Object.entries(counts).map(([k,v])=>`# ${k} ${v}`).join('\n')),/failed/);
 });
}
test('R3 release gate requires complete summary, not an exit code alone',()=>{
 assert.throws(()=>parseTapSummary('ok 1 - looks good\n'),/Incomplete/);
 assert.equal(parseTapSummary('# tests 1\n# pass 1\n# fail 0\n# skipped 0\n# cancelled 0\n# todo 0\n').pass,1);
});
test('R3 release tree hash includes tests and docs, not just the runtime fingerprint',()=>{
 const dir=mkdtempSync(join(tmpdir(),'sag-r3-manifest-'));
 try{writeFileSync(join(dir,'test.mjs'),'a');const before=treeFingerprint(dir);
  writeFileSync(join(dir,'test.mjs'),'b');assert.notEqual(treeFingerprint(dir),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('R3 staging gate refuses fabricated empty checklists and mismatched final revisions',()=>{
 assert.throws(()=>validateStagingEvidence({},'a','b'),/different/);
 const base={sourceSha256:'a',treeSha256:'b',mode:'SIMULATION',isolated:true,liveArmed:false,reviewedBy:'reviewer',reviewedAt:new Date().toISOString()};
 assert.throws(()=>validateStagingEvidence(base,'a','b'),/Unverified/);
 assert.throws(()=>validateStagingEvidence({...base,mode:'LIVE'},'a','b'),/SIMULATION/);
});
