/** Native PostgreSQL release gate. Creates and drops ONLY a randomly named test schema.
 * Explicitly requires a DISPOSABLE database and never uses DATABASE_URL.
 * Not running this test is a release blocker, not a pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { Database } from '../src/db.mjs';
import { shadowFixture } from './helpers/r3-fixtures.mjs';
import { evaluateShadowWithOriginalGuard } from '../src/profitGuard.mjs';
import { executionSettingsHash,shadowScope,SHADOW_PROTOCOL } from '../src/shadowProtocol.mjs';
import { calculateAuroraSnapshotFromFeeModel } from '../src/doctrine.mjs';

const enabled=Boolean(process.env.SAGITTARIUS_TEST_DATABASE_URL && process.env.SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB==='1');
test('R3 POSTGRES GATE: real migrations, admission, simultaneous stop CAS, immutable proof, Starlight, restart and commit ambiguity',
 {skip:!enabled,timeout:120000},async(t)=>{
  const url=process.env.SAGITTARIUS_TEST_DATABASE_URL;
  if(url===process.env.DATABASE_URL)throw Error('use a separate disposable test database, not the application DATABASE_URL');
  const schema=`sag_r3_${randomUUID().replaceAll('-','')}`;
  const ssl=/localhost|127\.0\.0\.1|\[::1\]/.test(url)?false:{rejectUnauthorized:false};
  const admin=new pg.Pool({connectionString:url,ssl,max:2});
  const instances=[];
  async function connection(){
   const db=new Database(url);await db.close();
   const options=`-c search_path=${schema},public`;
   db.pool=new pg.Pool({connectionString:url,ssl,options,max:8,connectionTimeoutMillis:5000});
   db.lockPool=new pg.Pool({connectionString:url,ssl,options,max:2,connectionTimeoutMillis:5000});
   instances.push(db);return db;
  }
  await admin.query(`create schema "${schema}"`);
  try{
   const db=await connection();await db.init();
   const template=shadowFixture({settings:{crashRecoveryStakeCents:1000,startingCapitalCents:1000000}});
   await db.saveSettings(template.settings);
   const saved=await db.loadSettings(template.settings);
   const make=(id)=>shadowFixture({id,settings:saved});
   const f=make('NATIVE-PARENT-1');f.scope=await db.captureShadowScope(saved);
   const inserted=await db.insertShadowEntry(f.entry,f.scope);
   assert.equal(inserted.ok,true);assert.equal((await db.insertShadowEntry(f.entry,f.scope)).ok,false);
   const parent=await db.entryById(f.entry.id);
   assert.equal(parent.executionClass,'SHADOW_SAINT');assert.ok(parent.shadowEntryHash);
   const cash=await db.simulationCashAggregate(saved.systemName,{simFeeCents:2});assert.equal(cash.reservedCents,0);assert.equal(cash.realizedCents,0);
   const observation=f.market();
   const evaluation=await evaluateShadowWithOriginalGuard(parent,observation,{settings:saved});
   assert.equal(evaluation.closed,true);
   const results=await Promise.allSettled([
    db.commitShadowEvaluation(parent,observation,evaluation,f.scope),
    db.commitShadowEvaluation(parent,observation,evaluation,f.scope)
   ]);
   assert.equal(results.filter(x=>x.status==='fulfilled'&&x.value.closed===true).length,1);
   const tally=await db.pool.query('select count(*)::int as n from sag_shadow_stops_v3 where parent_entry_id=$1',[parent.id]);
   assert.equal(tally.rows[0].n,1);
   const authority=await db.verifiedShadowStop(parent.id,f.scope);assert.ok(authority);assert.ok(authority.proof.pnlCents<0);
   assert.equal(authority.proof.filled,10);assert.equal(authority.watch.status,'ARMED');
   await assert.rejects(db.pool.query("update sag_entries set entry_config=entry_config||'{\"changed\":true}'::jsonb where id=$1",[parent.id]),/immutable/);
   await assert.rejects(db.pool.query('update sag_shadow_stops_v3 set proof_hash=$2 where parent_entry_id=$1',[parent.id,'fake']),/immutable/);
   await assert.rejects(db.pool.query("update sag_starlight_recovery_v1 set watch=jsonb_set(watch,'{ownerId}','\"other\"') where parent_entry_id=$1",[parent.id]),/immutable/);
   await assert.rejects(db.updateEntry(parent.id,{pnlCents:100}),/sag_entry_update_missing/);
   assert.equal((await db.openHunterEntries(saved.systemName)).length,0);
   const claim={...authority.watch,status:'EXECUTING',link:true};
   const claimed=await db.updateStarlightWatch(claim,authority.watch.revision);assert.ok(claimed);
   const liveClaim={...claimed.watch,revision:Number(claimed.revision),status:claimed.status};
   const fresh=f.market(64),now=Date.now();
   const capital={...parent,id:`STARLIGHT-NATIVE:${parent.id}`,conceptName:'Crash Recovery Hunter',executionClass:'CAPITAL',
    sourceTradeId:parent.id,sourceFeeder:parent.conceptName,status:'open',entryPriceCents:65,currentPriceCents:65,peakPriceCents:65,
    remainingCount:10,pnlCents:0,entryFeeCents:20,exitFeeCents:0,openedAtMs:now,updatedAtMs:now,closedAtMs:null,
    shadowEpoch:null,shadowEntryHash:null,shadowRevision:0,shadowState:{},
    entryConfig:{executionClass:'CAPITAL',executionSettingsHash:executionSettingsHash(saved),starlightRecovery:liveClaim,
     entryExecutionWitness:{...fresh,limitPriceCents:65,averagePriceCents:65,filled:10},
     aurora:calculateAuroraSnapshotFromFeeModel({entryPriceCents:65,count:10,entryFeeCents:20,
      mode:'SIMULATION',simFeeCents:2,damageControlPercent:saved.crashRecoveryHunterAuroraDamageControlPercent,calculatedAtMs:now})}};
   await db.insertEntry(capital);assert.equal((await db.openHunterEntries(saved.systemName)).length,1);
   await assert.rejects(db.insertEntry({...capital,id:capital.id+':DUPLICATE'}));
   await db.updateStarlightWatch({...liveClaim,status:'CONSUMED',recoveredChildId:capital.id},liveClaim.revision);
   await assert.rejects(db.pool.query("update sag_starlight_recovery_v1 set status='ARMED' where parent_entry_id=$1",[parent.id]),/terminal/);
   const page=await db.shadowDiagnostics(f.scope,{limit:10});assert.equal(page.length,1);assert.equal(page[0].recovery.recoveredChildId,capital.id);
   const stats=await db.performanceAggregate(saved.systemName);assert.equal(stats.open_hunters,1);assert.equal(stats.closed_hunters,0);
   const reopened=await connection();await reopened.init();
   const recovered=await reopened.verifiedShadowStop(parent.id,f.scope);assert.equal(recovered.watch.status,'CONSUMED');
   assert.equal((await reopened.entryById(capital.id)).conceptName,'Crash Recovery Hunter');
   const code=`import pg from 'pg'; const pool=new pg.Pool({connectionString:process.env.SAGITTARIUS_TEST_DATABASE_URL,ssl:${JSON.stringify(ssl)},options:'-c search_path=${schema},public'}); try {const r=await pool.query('select status from sag_starlight_recovery_v1 where parent_entry_id=$1',[${JSON.stringify(parent.id)}]);console.log(r.rows[0].status);}finally{await pool.end();}`;
   const child=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:process.env,encoding:'utf8',timeout:10000});
   assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/CONSUMED/);

   // Real COMMIT succeeds, transport acknowledgment is deliberately lost.
   const second=make('NATIVE-PARENT-COMMIT-UNKNOWN');second.scope=await db.captureShadowScope(saved);
   await db.insertShadowEntry(second.entry,second.scope);const secondParent=await db.entryById(second.entry.id);
   const secondObs=second.market(),secondEval=await evaluateShadowWithOriginalGuard(secondParent,secondObs,{settings:saved});
   const realPool=db.shadowStore.pool;let injected=false;
   db.shadowStore.pool={connect:async()=>{
    const client=await realPool.connect();return {release:(...a)=>client.release(...a),query:async(sql,...args)=>{
     const result=await client.query(sql,...args);if(sql==='COMMIT'&&!injected){injected=true;throw Error('injected lost COMMIT acknowledgment');}return result;
    }};
   }};
   await assert.rejects(db.commitShadowEvaluation(secondParent,secondObs,secondEval,second.scope),/lost COMMIT/);
   db.shadowStore.pool=realPool;
   assert.ok(await db.verifiedShadowStop(secondParent.id,second.scope));
   assert.equal((await db.commitShadowEvaluation(secondParent,secondObs,secondEval,second.scope)).ok,false);

   // A new persisted mode/revision cannot reuse an old close token.
   const third=make('NATIVE-PARENT-MODE');third.scope=await db.captureShadowScope(saved);
   await db.insertShadowEntry(third.entry,third.scope);const thirdParent=await db.entryById(third.entry.id);
   const thirdObs=third.market(),thirdEval=await evaluateShadowWithOriginalGuard(thirdParent,thirdObs,{settings:saved});
   await db.saveSettings({...saved,mode:'LIVE',liveArmed:false});
   await assert.rejects(db.commitShadowEvaluation(thirdParent,thirdObs,thirdEval,third.scope),/runtime_fence_changed/);
   assert.equal((await db.entryById(thirdParent.id)).status,'open');
   assert.equal(await db.verifiedShadowStop(thirdParent.id,third.scope),null);
   t.diagnostic('Native PostgreSQL protocol complete; no external broker or production database used.');
  }finally{
   for(const db of instances)await db.close();
   await admin.query(`drop schema if exists "${schema}" cascade`);await admin.end();
  }
 });
