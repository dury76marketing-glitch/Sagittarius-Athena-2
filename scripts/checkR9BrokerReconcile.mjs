#!/usr/bin/env node
// R9 authenticated reconciliation and prospective mode-scope contracts.
// Real application functions with isolated synthetic DB/broker boundaries only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(process.env.R9_RECON_CHILD!=='1'){
  const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname],{
    env:{...process.env,ALLOW_LIVE_TRADING:'true',R9_RECON_CHILD:'1'},encoding:'utf8',timeout:18000});
  assert.equal(r.status,0,r.stderr.slice(0,800));
  const out=JSON.parse(r.stdout.trim().split('\n').at(-1));
  assert.equal(out.failed,0);assert.equal(out.modeScopeLive,true);
  console.log(JSON.stringify(out));
}else{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {OperationalMonitor}=await import('../src/operationalSafety.mjs');
  let passes=0;
  function fixture({outage=false,credentials=true,orders=[],positions=[],owned=[]}={}){
    let calls=0;
    const settings={mode:'SIMULATION',liveArmed:false,engineActive:true,
      ownerId:'R9-LAB',systemName:'CLONE-LAB',resetTimestampMs:0};
    const operational=new OperationalMonitor();operational.initialized=true;
    const obj={settings,health:{reconciliationOk:false},operational,
      credentials:credentials?{keyId:'fake',privateKeyPem:'fake'}:null,
      cloneIdentity:{tag:'cafebabecafebabe'},
      kalshi:{getPositions:async()=>{calls++;if(outage)throw Error('broker_unavailable');return positions;},
        getOpenOrders:async()=>{calls++;return orders;},
        getBalance:async()=>{calls++;return{balance:10_000,portfolio_value:0};},
        mutationLane:{active:0,queue:[]}},
      db:{liveOpenHunterEntries:async()=>owned,liveFundedOrphanEntries:async()=>[],audit:async()=>{}},
      recomputeHealth(){}};
    return {obj,settings,operational,calls:()=>calls};
  }
  {const f=fixture({credentials:false});
   const ok=await SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
   assert.equal(ok,false);assert.equal(f.obj.health.reconciliationOk,false);assert.equal(f.calls(),0);passes+=3;}
  {const f=fixture({outage:true});
   await assert.rejects(()=>SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'}),/broker_unavailable/);
   assert.equal(f.obj.health.reconciliationOk,false);assert(f.calls()>=1);
   assert.equal(f.operational.accountStatus({...f.settings,mode:'LIVE'}).ok,false);passes+=4;}
  {const f=fixture();const ok=await SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
   assert.equal(ok,true);assert.equal(f.calls(),3);
   assert.equal(f.operational.accountStatus(f.settings).ok,false,'do not mislabel SIM scope as broker-ready LIVE');
   const future={...f.settings,mode:'LIVE'};
   assert.equal(f.operational.accountStatus(future).ok,true,'future LIVE scope must have clean broker evidence');
   // A committed mode switch changes the operator scope, not the account's
   // proof contents. No extra broker read is required solely to relabel it.
   f.obj.settings=future;
   assert.equal(f.operational.accountStatus(f.obj.settings).ok,true);passes+=5;}
  {const f=fixture();
   f.obj.reconcileBroker=(options)=>SagittariusEngine.prototype.reconcileBroker.call(f.obj,options);
   f.obj._reconcileBroker=(options)=>SagittariusEngine.prototype._reconcileBroker.call(f.obj,options);
   f.obj.reconcilePromise=Promise.resolve().then(()=>{f.obj.reconcilePromise=null;f.obj.reconcilePromiseScope=null;return true;});f.obj.reconcilePromiseScope='SIMULATION';
   const run=await SagittariusEngine.prototype.reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
   assert.equal(run,true);assert.equal(f.calls(),3);
   assert.equal(f.operational.accountStatus({...f.settings,mode:'LIVE'}).ok,true);passes+=3;}
  // Normal local BUY intents must not poison global LIVE reconciliation.
  // A real partial fill remains inventory and requires matching broker truth.
  {
    const pending={id:'pending-owner-a',mode:'LIVE',status:'entry_pending',
      executionClass:'CAPITAL',entryClientOrderId:'sagc-cafebabecafebabe-TEST_OWNER-pending',
      ticker:'R9-PENDING-A',count:1,remainingCount:1,entryPriceCents:72,
      entryConfig:{brokerRouting:{exchangeIndex:3}}};
    const f=fixture({owned:[pending]});
    const ok=await SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
    assert.equal(ok,true,'known pending order alone must not fail account');
    assert.equal(f.operational.accountStatus({...f.settings,mode:'LIVE'}).ok,true);
    passes+=2;
  }
  {
    const pending={id:'partial-owner-a',mode:'LIVE',status:'entry_pending',
      executionClass:'CAPITAL',entryClientOrderId:'sagc-cafebabecafebabe-TEST_OWNER-partial',
      entryOrderId:'FILL-ORDER-A',ticker:'R9-PARTIAL-A',count:5,remainingCount:5,
      entryPriceCents:72,entryConfig:{brokerRouting:{exchangeIndex:3},
      entryFillProof:{authoritative:true,filledCount:2}}};
    const f=fixture({owned:[pending],positions:[{ticker:'R9-PARTIAL-A',position:2}]});
    const ok=await SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
    assert.equal(ok,true,'partial fill proof should require 2, not all 5 contracts');
    passes++;
  }
  {
    const pending={id:'pending-unknown-owner',mode:'LIVE',status:'entry_pending',
      ticker:'R9-UNKNOWN',count:1,entryConfig:{brokerRouting:{exchangeIndex:3}}};
    const f=fixture({owned:[pending]});
    const ok=await SagittariusEngine.prototype._reconcileBroker.call(f.obj,{authorityMode:'LIVE'});
    assert.equal(ok,false,'unidentified pending LIVE order is not safe');
    passes++;
  }
  console.log(JSON.stringify({kind:'SYNTHETIC_REAL_RECONCILIATION_FUNCTION',passed:passes,failed:0,modeScopeLive:true,networkCalls:0,nativePostgres:0}));
}
