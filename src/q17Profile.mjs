// Q-17 is a simulation-only executable product. This hard-coded profile
// cannot be enabled for LIVE by environment variables or dashboard actions.
// Market-data GETs are allowed; broker/account reads and ALL writes fail closed.
export const Q17_SIM_ONLY = true;
export const Q17_RELEASE = 'SAGITTARIUS-Q-17-R4-LP-ARROW-CAPITAL-PARITY-2026-11-19';
export const Q17_DATABASE_ACK = 'Q17_SEPARATE_DISPOSABLE_SIM_DATABASE';
export function q17SimSettings(settings={}) {
  return {...settings,mode:'SIMULATION',liveArmed:false,liveOwnerAuthorized:false};
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
  if(m!=='GET')throw new Error('q17_broker_mutation_compiled_out');
  if(!/^\/(?:markets|events|series|milestones|live_data|game_stats|sports)(?:\/|$)/.test(path))
    throw new Error('q17_account_or_unknown_endpoint_forbidden');
  return true;
}
export async function q17ForbiddenLiveExecution() {
  throw new Error('q17_live_execution_removed');
}
