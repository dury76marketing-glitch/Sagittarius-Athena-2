// R38: the execution epoch and SIM archival share the settings row lock used
// by all native capital admissions. No provider/broker work occurs in this tx.
const SETTINGS_LOCK='MW-R25-SAVED-RUNTIME-CARD';
const RECEIPT_KEY='simulation_reset_receipt';

function resetError(reason,outcome='UNKNOWN'){
  const error=new Error(reason);error.resetOutcome=outcome;return error;
}
function requestScope(request){
  const systemName=String(request?.systemName||''),ownerId=String(request?.ownerId||'');
  const requestId=String(request?.requestId||'');
  const expectedEpoch=Number(request?.expectedEpoch),resetEpoch=Number(request?.resetEpoch);
  const safetyRevision=Number(request?.safetyRevision);
  if(!systemName||!ownerId||!requestId||requestId.length>128
    ||!Number.isSafeInteger(expectedEpoch)||expectedEpoch<0
    ||!Number.isSafeInteger(resetEpoch)||resetEpoch<=expectedEpoch
    ||!Number.isSafeInteger(safetyRevision)||safetyRevision<0)
    throw resetError('simulation_reset_request_invalid','ROLLED_BACK');
  return {systemName,ownerId,requestId,expectedEpoch,resetEpoch,safetyRevision};
}
function sameScope(settings,scope,epoch){
  return settings?.systemName===scope.systemName&&settings?.ownerId===scope.ownerId
    &&settings?.mode==='SIMULATION'&&Number(settings.resetTimestampMs||0)===epoch;
}
function safetyState(request,scope){
  if(typeof request.readSafetyState!=='function')return {revision:scope.safetyRevision,settings:{}};
  // Synchronous snapshot only: never hold the row lock across external work.
  const current=request.readSafetyState();
  if(!current||typeof current.then==='function'
    ||!Number.isSafeInteger(current.revision)||current.revision<scope.safetyRevision
    ||!sameScope(current.settings,scope,scope.expectedEpoch)
    ||current.settings.engineActive!==false||current.settings.liveArmed===true)
    throw resetError('simulation_reset_safety_scope_changed','ROLLED_BACK');
  // A newer restrictive Stop/Disarm is compatible; it can never be overwritten
  // by this reset. A concurrent enable or scope change fails the transaction.
  return current;
}
async function lockRuntime(client){
  await client.query('BEGIN');
  await client.query("set local lock_timeout='5000ms'");
  await client.query("set local statement_timeout='15000ms'");
  await client.query("set local idle_in_transaction_session_timeout='15000ms'");
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[SETTINGS_LOCK]);
  const row=await client.query("select value from sag_settings where key='runtime' for update");
  if(!row.rows?.[0]?.value)throw resetError('simulation_reset_runtime_missing');
  return row.rows[0].value;
}
async function readReceipt(client){
  const row=await client.query('select value from sag_settings where key=$1',[RECEIPT_KEY]);
  return row.rows?.[0]?.value||null;
}
async function verifyReceipt(client,scope,settings,receipt){
  if(receipt?.requestId!==scope.requestId)return null;
  if(receipt?.version!=='R38-ATOMIC-SIM-RESET'
    ||receipt.systemName!==scope.systemName||receipt.ownerId!==scope.ownerId
    ||Number(receipt.fromEpoch)!==scope.expectedEpoch||Number(receipt.toEpoch)!==scope.resetEpoch
    ||!sameScope(settings,scope,scope.resetEpoch))
    throw resetError('simulation_reset_receipt_scope_mismatch');
  const rows=await client.query(`select count(*)::int as stale_unarchived
    from sag_entries where system_name=$1 and owner_id=$2
      and upper(mode)='SIMULATION' and archived=false
      and coalesce(shadow_epoch,0)<$3`,[scope.systemName,scope.ownerId,scope.resetEpoch]);
  if(Number(rows.rows?.[0]?.stale_unarchived||0)!==0)
    throw resetError('simulation_reset_receipt_rows_inconsistent');
  return {outcome:'COMMITTED',settings,receipt,archivedEntries:Number(receipt.archivedEntries||0)};
}

/** Readback takes the same lock, so it cannot mistake an in-flight COMMIT for
 * rollback. A transport error never authorizes an old-epoch retry. */
export async function reconcileSimulationReset(pool,request){
  const scope=requestScope(request),client=await pool.connect();let inTx=false;
  try{
    inTx=true;const settings=await lockRuntime(client),receipt=await readReceipt(client);
    const committed=await verifyReceipt(client,scope,settings,receipt);
    let result=committed;
    if(!result){
      if(!sameScope(settings,scope,scope.expectedEpoch))
        throw resetError('simulation_reset_reconciliation_scope_changed');
      result={outcome:'ROLLED_BACK',settings,receipt:null,archivedEntries:0};
    }
    await client.query('COMMIT');inTx=false;return result;
  }catch(error){
    if(inTx)try{await client.query('ROLLBACK');}catch{ /* release destroys below */ }
    error.resetOutcome='UNKNOWN';throw error;
  }finally{client.release(inTx?new Error('simulation_reset_readback_incomplete'):undefined);}
}

export async function commitSimulationReset(pool,request){
  const scope=requestScope(request),client=await pool.connect();
  let inTx=false,commitAttempted=false,released=false;
  try{
    inTx=true;const settings=await lockRuntime(client),previous=await readReceipt(client);
    const priorCommit=await verifyReceipt(client,scope,settings,previous);
    if(priorCommit){commitAttempted=true;await client.query('COMMIT');inTx=false;return {...priorCommit,recovered:true};}
    if(!sameScope(settings,scope,scope.expectedEpoch))
      throw resetError('simulation_reset_durable_scope_changed');
    safetyState(request,scope);
    const revisionRow=await client.query("select value from sag_settings where key='runtime_commit_revision' for update");
    const revision=Math.max(0,Math.trunc(Number(revisionRow.rows?.[0]?.value?.revision||0)))+1;
    if(!Number.isSafeInteger(revision))throw resetError('runtime_settings_revision_overflow','ROLLED_BACK');
    // Fresh schemas require both fields. Legacy rows without explicit ownership
    // or mode have no supported inference rule: preserve and report them.
    const legacyRows=await client.query(`select
      count(*) filter(where owner_id=$2 and mode is null)::int as null_mode,
      count(*) filter(where owner_id is null and (mode is null or upper(mode)='SIMULATION'))::int as null_owner
      from sag_entries where system_name=$1 and archived=false
        and (owner_id=$2 or owner_id is null)`,[scope.systemName,scope.ownerId]);
    const changedAtMs=Date.now();
    const archived=await client.query(`update sag_entries set archived=true,updated_at_ms=$3
      where system_name=$1 and owner_id=$2 and archived=false and upper(mode)='SIMULATION'`,
    [scope.systemName,scope.ownerId,changedAtMs]);
    const finalSafety=safetyState(request,scope);
    const next={...settings,resetTimestampMs:scope.resetEpoch,engineActive:false,liveArmed:false};
    for(const key of ['liveDashboardStartMs','simulationDashboardStartMs']){
      const latest=finalSafety.settings?.[key];
      if(latest!=null&&Number.isSafeInteger(Number(latest))&&Number(latest)>Number(next[key]||0))next[key]=Number(latest);
    }
    const receipt={version:'R38-ATOMIC-SIM-RESET',requestId:scope.requestId,
      systemName:scope.systemName,ownerId:scope.ownerId,mode:'SIMULATION',
      fromEpoch:scope.expectedEpoch,toEpoch:scope.resetEpoch,changedAtMs,revision,
      requestedSafetyRevision:scope.safetyRevision,effectiveSafetyRevision:finalSafety.revision,
      archivedEntries:Number(archived.rowCount||0),
      preservedLegacyRows:{nullMode:Number(legacyRows.rows?.[0]?.null_mode||0),nullOwner:Number(legacyRows.rows?.[0]?.null_owner||0)},
      engineActive:false,liveArmed:false};
    await client.query("insert into sag_settings(key,value) values('runtime',$1) on conflict(key) do update set value=excluded.value,updated_at=now()",[next]);
    await client.query("insert into sag_settings(key,value) values('runtime_commit_revision',$1) on conflict(key) do update set value=excluded.value,updated_at=now()",[{revision,changedAtMs}]);
    await client.query('insert into sag_settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value,updated_at=now()',[RECEIPT_KEY,receipt]);
    await client.query("insert into sag_audit(level,event,data) values('info','simulation_reset_atomic_commit',$1::jsonb)",[JSON.stringify(receipt)]);
    safetyState(request,scope);
    commitAttempted=true;await client.query('COMMIT');inTx=false;
    return {outcome:'COMMITTED',settings:next,receipt,archivedEntries:receipt.archivedEntries,recovered:false};
  }catch(error){
    if(commitAttempted){
      // Destroy the uncertain connection before a fresh lock/read. Reusing it
      // could conceal a still-running COMMIT or leak an aborted transaction.
      client.release(error);released=true;inTx=false;
      try{
        const resolved=await reconcileSimulationReset(pool,request);
        if(resolved.outcome==='COMMITTED')return {...resolved,recovered:true};
        error.resetOutcome='ROLLED_BACK';
      }catch(readbackError){
        error.resetOutcome='UNKNOWN';error.resetReadbackError=String(readbackError?.message||readbackError);
      }
    }else{
      let rolledBack=!inTx;
      if(inTx)try{await client.query('ROLLBACK');inTx=false;rolledBack=true;}catch{}
      if(rolledBack)error.resetOutcome='ROLLED_BACK';
      else error.resetOutcome='UNKNOWN';
    }
    throw error;
  }finally{if(!released)client.release(inTx?new Error('simulation_reset_transaction_incomplete'):undefined);}
}
