// Durable clone identity and broker order provenance only. This module never
// changes strategy, account credentials, fills, prices, or execution authority.
import {createHash, randomUUID} from 'node:crypto';

export const CLONE_IDENTITY_SQL=`
CREATE TABLE IF NOT EXISTS sag_clone_identity_v1 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  clone_id uuid NOT NULL UNIQUE,
  installation_hash text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
)`;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const cloneTag=cloneId=>UUID.test(String(cloneId||''))?String(cloneId).replaceAll('-','').slice(0,16).toLowerCase():null;
export function installationBinding(environment=process.env){
  // RAILWAY_SERVICE_ID is stable over deployments; a deployment/replica ID is
  // deliberately unsuitable, because that changes on normal rollout.
  return String(environment.SAGITTARIUS_CLONE_BINDING||environment.RAILWAY_SERVICE_ID||'').trim();
}
export const installationHash=value=>value?createHash('sha256').update(`sagittarius-installation:v1:${value}`).digest('hex'):null;
export async function loadOrCreateCloneIdentity(pool,{binding=installationBinding()}={}){
  if(typeof pool?.query!=='function')throw new Error('clone_identity_database_required');
  const bindingHash=installationHash(binding);
  await pool.query(CLONE_IDENTITY_SQL);
  // INSERT ... ON CONFLICT retains the original UUID through redeployment,
  // migration and settings reset. Historical orders keep their original IDs.
  await pool.query(`INSERT INTO sag_clone_identity_v1(singleton,clone_id,installation_hash)
    VALUES(true,$1,$2) ON CONFLICT(singleton) DO NOTHING`,[randomUUID(),bindingHash]);
  const read=async()=>{
    const r=await pool.query('SELECT clone_id::text AS clone_id,installation_hash FROM sag_clone_identity_v1 WHERE singleton=true');
    if(r.rows?.length!==1||!UUID.test(String(r.rows[0].clone_id||'')))throw new Error('clone_identity_invalid_persisted_record');
    return r.rows[0];
  };
  let row=await read();
  if(row.installation_hash && bindingHash && row.installation_hash!==bindingHash)
    throw new Error('clone_identity_database_attached_to_different_installation');
  if(!row.installation_hash&&bindingHash){
    await pool.query('UPDATE sag_clone_identity_v1 SET installation_hash=$1,updated_at=clock_timestamp() WHERE singleton=true AND installation_hash IS NULL',[bindingHash]);
    row=await read();
    if(row.installation_hash!==bindingHash)throw new Error('clone_identity_binding_conflict');
  }
  return Object.freeze({id:String(row.clone_id).toLowerCase(),tag:cloneTag(row.clone_id),bindingHash:row.installation_hash||null,
    deploymentBound:Boolean(row.installation_hash&&bindingHash&&row.installation_hash===bindingHash),
    version:'SAG-CLONE-IDENTITY-V1'});
}

// Client IDs have an explicit, unambiguous, durable clone token. Never accept
// a prefix alone as proof of fill ownership; exact authenticated broker
// order/fill identities are mandatory without any shared clone registry.
const TOKEN=/^sagc-([0-9a-f]{16})-/i;
export const clientCloneTag=clientOrderId=>typeof clientOrderId==='string'
  ?clientOrderId.match(TOKEN)?.[1]?.toLowerCase()||null:null;
export const cloneClientOrderPrefix=(cloneId,ownerId,tradeId,phase)=>{
  const tag=cloneTag(cloneId);
  if(!tag)throw new Error('clone_identity_required_for_live_order');
  const sanitize=(v,n)=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,n);
  const o=sanitize(ownerId,8),t=sanitize(tradeId,10),p=sanitize(phase,9);
  if(!o||!t||!p)throw new Error('clone_order_provenance_invalid');
  return `sagc-${tag}-${o}-${t}-${p}-`;
};

// Preserve the exact R6 independent-mode admission checks that previously
// lived in the optional shared broker coordination module. Stateless only:
// no new database, account lock, identity claim, or change to Multiply.
export function validateCloneOrderIntent({tag,bindingHash,clientOrderId,ticker}={}){
  const client=String(clientOrderId||''),market=String(ticker||'');
  if(!/^[0-9a-f]{16}$/.test(String(tag||''))
    ||!/^[0-9a-f]{64}$/.test(String(bindingHash||''))
    ||!client.startsWith(`sagc-${tag}-`)||client.length>64||client.length<20
    ||!market||market.length>180)
    return {ok:false,reason:'clone_order_intent_identity_invalid'};
  return {ok:true,independent:true,clientOrderId:client};
}

export function classifyCloneRestingOrders(orders=[],owned=[],{localTag=null}={}){
  if(!Array.isArray(orders)||!Array.isArray(owned))throw new Error('clone_order_classification_input_invalid');
  const knownIds=new Set(),knownClients=new Set(),knownOrderPairs=new Map(),knownClientOrderPairs=new Map(),knownIdTickers=new Map(),knownClientTickers=new Map(),tickers=new Set();
  for(const e of owned){
    if(e.ticker)tickers.add(String(e.ticker));
    for(const [orderKey,clientKey] of [['entryOrderId','entryClientOrderId'],['exitOrderId','exitClientOrderId']]){
      if(e[orderKey]){
        const orderId=String(e[orderKey]),ticker=String(e.ticker||'');
        knownIds.add(orderId);
        const oldTicker=knownIdTickers.get(orderId);
        knownIdTickers.set(orderId,oldTicker!=null&&oldTicker!==ticker?'CONFLICTING_LOCAL_TICKERS':ticker);
        if(e[clientKey]){
          const clientId=String(e[clientKey]);
          const oldClient=knownOrderPairs.get(orderId);
          knownOrderPairs.set(orderId,oldClient!=null&&oldClient!==clientId?'CONFLICTING_LOCAL_CLIENT_IDS':clientId);
          // Reconciliation needs the reverse direction too: a broker order
          // cannot inherit local ownership by reusing a known client ID while
          // carrying a different authenticated broker order ID.
          const previous=knownClientOrderPairs.get(clientId);
          knownClientOrderPairs.set(clientId,previous&&previous!==orderId?'CONFLICTING_LOCAL_ORDER_IDS':orderId);
        }
      }
    }
    for(const k of ['entryClientOrderId','exitClientOrderId'])if(e[k]){
      const clientId=String(e[k]),ticker=String(e.ticker||'');
      knownClients.add(clientId);
      const oldTicker=knownClientTickers.get(clientId);
      knownClientTickers.set(clientId,oldTicker!=null&&oldTicker!==ticker?'CONFLICTING_LOCAL_TICKERS':ticker);
    }
  }
  const summary={knownResting:0,foreignConfirmed:0,unattributed:0,unknownOnOwned:0,
    otherSystemResting:0,ownershipConflicts:0,foreignTickers:[]};
  const seenForeign=new Set();
  for(const o of orders){
    const ticker=String(o?.ticker??o?.market_ticker??'');
    const id=String(o?.order_id||'');const client=String(o?.client_order_id||'');
    const token=clientCloneTag(client),onOwnTicker=tickers.has(ticker);
    const localMatch=knownIds.has(id)||knownClients.has(client);
    if(localMatch){
      const paired=knownOrderPairs.get(id);
      const clientPairedOrder=knownClientOrderPairs.get(client);
      // An exact order ID cannot be reassigned to a different client ID;
      // otherwise two clones could claim the same broker order identity.
      if((paired&&paired!==client)||(clientPairedOrder&&clientPairedOrder!==id)
        ||(knownIdTickers.has(id)&&knownIdTickers.get(id)!==ticker)
        ||(knownClientTickers.has(client)&&knownClientTickers.get(client)!==ticker)
        ||(token&&localTag&&token!==localTag)){summary.ownershipConflicts++;summary.unattributed++;}
      else summary.knownResting++;
      continue;
    }
    // Authenticated broker orders with another clone's exact token remain
    // external. Never infer local ownership from a shared ticker.
    if(token&&localTag&&token!==localTag){
      if(!id||!ticker){
        if(onOwnTicker){summary.unknownOnOwned++;summary.unattributed++;}
        else summary.otherSystemResting++;
      }else summary.otherSystemResting++;
      continue;
    }
    if(onOwnTicker){summary.unknownOnOwned++;summary.unattributed++;}
    else summary.otherSystemResting++;
  }
  summary.foreignTickers=[...seenForeign].sort();
  return summary;
}
