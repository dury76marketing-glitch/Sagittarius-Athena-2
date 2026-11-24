/**
 * R17.7-R7 — qualified Gold Saint LIVE admission boundary.
 *
 * This is NOT a strategy decision or permission to issue broker orders.
 * The authoritative Gold Saint card, native SQL claim/seat, executable REST
 * book, available broker cash, immutable client order ID and send receipts
 * remain in their existing mandatory stages.
 *
 * An already-persisted qualifying WATCH must not depend on optional scanner,
 * shadow research, Golden Eye, aggregate WebSocket, background queues or
 * global dashboard health. The necessary current-account and funded-position
 * invariants remain fail-closed.
 */
const invalid = reason => ({ok:false,reason});
export function qualifiedGoldSaintLiveAdmission({
  settings=null,
  prospectiveArm=false,
  running=false,
  stopping=false,
  deploymentAllowed=false,
  cloneBound=false,
  credentialsAvailable=false,
  databaseAvailable=false,
  accountProof=null,
  protectionOk=false,
  lastProtectionAtMs=0,
  protectionFreshMs=10000,
  fatalReason=null,
  watchdogUnsafe=false,
  now=Date.now(),
}={}){
  if(settings?.mode!=='LIVE')return invalid('live_mode_not_authorized');
  if(!prospectiveArm && (settings.liveArmed!==true||settings.liveOwnerAuthorized!==true))
    return invalid('live_owner_authorization_missing');
  if(settings.engineActive!==true||!running||stopping)return invalid('engine_not_running');
  if(!deploymentAllowed||!cloneBound)return invalid('live_deployment_not_authorized');
  if(!credentialsAvailable)return invalid('broker_credentials_unavailable');
  if(!databaseAvailable)return invalid('durable_order_database_unavailable');
  if(fatalReason)return invalid('critical_operational_safety_fault');
  if(watchdogUnsafe)return invalid('independent_watchdog_not_healthy');
  // A validated, exact-scope authenticated account snapshot is mandatory.
  // In particular a missing or stale proof does not become synthetic cash.
  if(accountProof?.ok!==true)return invalid(String(accountProof?.reason||'account_not_verified').slice(0,100));
  // A successful complete protection sweep is the independent proof that
  // existing funded exits continue to be serviced. Research/scan worker
  // freshness is *not* a substitute for this actual protection proof.
  if(!protectionOk)return invalid('funded_position_protection_failed');
  const age=now-Number(lastProtectionAtMs||0);
  if(!(lastProtectionAtMs>0&&age>=0&&age<=protectionFreshMs))
    return invalid('funded_position_protection_evidence_stale');
  return {ok:true,reason:null,version:'R17-R7-SCOPED-QUALIFIED-LIVE-ADMISSION'};
}
