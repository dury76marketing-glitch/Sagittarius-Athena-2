// Q-17 R9: the SIM strategy remains authoritative; LIVE changes only execution.
// A LIVE-capable source is never a LIVE authorization: deployment policy,
// manual confirmation, clone identity, native broker proof and order receipts
// all remain required. Default deployment policy continues to deny LIVE.
export const Q17_SIM_ONLY = false;
export const Q17_RELEASE = 'SAGITTARIUS-R15-INTEGRATED-MEGAWAVE-TEST-CANDIDATE-2026-11-21';
export const Q17_DATABASE_ACK = 'Q17_SEPARATE_DISPOSABLE_SIM_DATABASE';
// Legacy API kept for strategy-module compatibility. The SIM-only mode
// override is retired; operator execution authority lives in runtime settings.
export function q17SimSettings(settings={}) {
  return {...settings};
}
export function assertQ17IsolatedDatabase({databaseUrl=process.env.DATABASE_URL,ack=process.env.Q17_ISOLATED_DATABASE_ACK}={}) {
  if(ack!==Q17_DATABASE_ACK)throw new Error('q17_isolated_database_ack_required');
  let parsed;
  try{parsed=new URL(databaseUrl);}catch{throw new Error('q17_postgres_url_required');}
  if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.hostname||!parsed.pathname||parsed.pathname==='/')
    throw new Error('q17_postgres_url_required');
  // This confirmation is an operator boundary, not proof that two URLs differ.
  // Q-17 must be deployed to its own NEW Railway service + PostgreSQL volume.
  return true;
}
export function q17AssertPublicMarketRequest(method,apiPath) {
  const m=String(method||'').toUpperCase();
  const path=String(apiPath||'').split('?')[0];
  const market=/^\/(?:markets|events|series|milestones|live_data|game_stats|sports)(?:\/|$)/.test(path);
  if(m==='GET'&&market)return true;
  // Compiled transport permission is not trading authority. This switch
  // only exposes the existing authenticated Kalshi V2 client to the engine;
  // the engine, broker lanes and durable database claims authorize each BUY.
  const policy=/^(?:1|true|yes|on)$/i.test(String(process.env.ALLOW_LIVE_TRADING||''));
  if(!policy)throw new Error('q17_live_transport_disabled_by_deployment');
  if(m==='GET' && (/^\/portfolio(?:\/|$)/.test(path)
      || /^\/historical\/(?:orders|fills|positions|cutoff)(?:\/|$)/.test(path)
      || path==='/account/limits'))return true;
  if(m==='POST' && (path==='/portfolio/events/orders'
      || path==='/portfolio/intra_exchange_instance_transfer'))return true;
  if(m==='DELETE'&&/^\/portfolio\/events\/orders\/[^/]+$/.test(path))return true;
  throw new Error('q17_transport_endpoint_not_authorized');
}
export async function q17ForbiddenLiveExecution() {
  throw new Error('q17_live_execution_removed');
}
