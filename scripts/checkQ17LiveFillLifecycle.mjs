#!/usr/bin/env node
/**
 * Readback-only, simulated connected lifecycle tests for the existing Q17
 * ProfitGuard. No PG / Kalshi network connection and NO production LIVE mode.
 * These checks do not certify the adapter's full lifecycle or broker ABI.
 */
import assert from 'node:assert/strict';
import {ProfitGuard} from '../src/profitGuard.mjs';
import {Q17_SIM_ONLY} from '../src/q17Profile.mjs';
assert.equal(Q17_SIM_ONLY,false);
const base=()=>({
  id:'Q17-FILL-1',ticker:'TEST-CAPITAL-1',eventTicker:'TEST-CAPITAL',
  systemName:'SIM-LIVE-ADAPTER-LAB',ownerId:'LAB_OWNER',mode:'LIVE',
  conceptName:'Great Horn Recovery',executionClass:'CAPITAL',status:'entry_pending',
  entryClientOrderId:'sagc-lab-entry1',entryOrderId:null,
  openedAtMs:Date.now()-10_000,updatedAtMs:Date.now()-10_000,
  count:1,remainingCount:1,entryPriceCents:72,entryFeeCents:0,
  stopLossCents:20,stopPriceCents:52,entryConfig:{executionClass:'CAPITAL',
    greatHornRecovery:{watchId:'GH-LAB',seat:1},
    // Preflight fee proof exists but the simulated broker readback is always authoritative.
    auroraPending:{version:'AURORA-DISABLED-FOR-LAB',preflight:{entryFeeCents:1}}
  }
});
let checks=0;
function mark(){checks++;}
function makeGuard({readback,byId=null}={}){
  const audits=[],writes=[];
  const guard=Object.create(ProfitGuard.prototype);
  guard.getSettings=()=>({simFeeCents:0,auroraDamageControlPercent:50});
  guard.audit=async(name,payload)=>{audits.push({name,payload});};
  guard.kalshi={
    async inspectOrderByClientId(){return readback;},
    async inspectOrderById(){return byId||readback;},
  };
  guard.db={
    async updateEntry(id,patch,exit,expected){
      assert.equal(id,'Q17-FILL-1');assert.equal(exit,null);
      assert.equal(expected.mode,'LIVE');assert.equal(expected.status,'entry_pending');
      writes.push({patch,expected});
    }
  };
  return {guard,audits,writes};
}
const filled=(overrides={})=>({found:true,authoritative:true,order:{
  orderId:'BROKER-ID-1',status:'executed',fillCount:1,
  averageFillPriceCents:71,feePaidCents:1,...overrides}});
for(const kind of ['Great Horn Recovery','Crystal Wall Recovery','Sagittarius Arrow Recovery','Scarlet Needle Recovery','Pegasus Ryu Sei Ken Recovery']){
  const entry=base();entry.conceptName=kind;
  const x=makeGuard({readback:filled()});
  const r=await x.guard.reconcilePending(entry);
  assert.equal(r.status,'open',`${kind}: ${r.status}`);
  assert.equal(r.count,1);assert.equal(r.entryPriceCents,71);assert.equal(r.entryFeeCents,1);
  assert.equal(x.writes.length,1);assert.equal(x.writes[0].patch.status,'open');
  assert.equal(r.entryConfig.entryFillProof.authoritative,true);
  assert.equal(r.entryConfig.entryFillProof.filledCount,1);
  assert.equal(r.entryConfig.entryFillProof.feePaidCents,1);
  mark();
}
{
  const x=makeGuard({readback:filled({status:'resting',fillCount:0.5})});
  const r=await x.guard.reconcilePending(base());
  assert.equal(r.status,'entry_pending');assert.equal(r.count,0.5);
  assert.equal(x.writes.length,1);
  assert.equal(r.entryConfig.entryFillProof.authoritative,true);
  mark();
}
{
  const x=makeGuard({readback:filled({status:'canceled',fillCount:0})});
  const r=await x.guard.reconcilePending(base());
  assert.equal(r.status,'rejected');assert.equal(x.writes.length,1);
  assert.equal(x.writes[0].patch.remainingCount,0);
  mark();
}
{
  const x=makeGuard({readback:{found:false,authoritative:false,reason:'broker_timeout',order:null}});
  const entry=base();const r=await x.guard.reconcilePending(entry);
  assert.equal(r.status,'entry_pending');assert.equal(x.writes.length,0);
  mark();
}
{
  const x=makeGuard({readback:{found:false,authoritative:true,order:null}});
  const r=await x.guard.reconcilePending(base());
  assert.equal(r.status,'entry_pending');assert.equal(x.writes.length,0);
  assert(x.audits.some(y=>y.name==='entry_pending_order_absence_unproven'));
  mark();
}
{
  const x=makeGuard({readback:filled({feePaidCents:null})});
  const r=await x.guard.reconcilePending(base());
  assert.equal(r.status,'entry_pending');assert.equal(x.writes.length,0);
  mark();
}
{
  const entry=base();entry.entryOrderId='OWN-BROKER-ID';
  const x=makeGuard({readback:filled({orderId:'DIFFERENT-ID'})});
  const r=await x.guard.reconcilePending(entry);
  assert.equal(r.status,'entry_pending');assert.equal(x.writes.length,0);
  assert(x.audits.some(y=>y.name==='entry_pending_broker_order_id_conflict'));
  mark();
}
{
  const entry=base();entry.entryConfig.entryFillProof={authoritative:true,filledCount:0.8};
  const x=makeGuard({readback:filled({fillCount:0.4,status:'resting'})});
  const r=await x.guard.reconcilePending(entry);
  assert.equal(r.status,'entry_pending');assert.equal(x.writes.length,0);
  assert(x.audits.some(y=>y.name==='entry_pending_broker_fill_regression'));
  mark();
}
console.log(JSON.stringify({test:'Q17_PRODUCTION_PROFIT_GUARD_READBACK_LIFECYCLE',kind:'MOCKED_INTEGRATION',passed:checks,failed:0,realBrokerOrders:0,nativeDatabaseTests:0}));
