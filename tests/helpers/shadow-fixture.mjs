/**
 * TEST ONLY. Upgrade legacy in-memory fixtures to the explicit shadow contract.
 * This is NOT a PostgreSQL substitute or integration certification. Production
 * Database instances are never decorated. Qualification/execution still runs
 * through the real StrategyEngine and pure witness validation.
 */
import { StrategyEngine } from '../../src/strategy.mjs';
import { authorityHash } from '../../src/authority.mjs';
import { isShadowSaintEntry } from '../../src/doctrine.mjs';
import { shadowScope, sameShadowScope, validateShadowEntry, shadowEntryHash } from '../../src/shadowProtocol.mjs';

export function completeFixtureMarket(original){
  if(!original)return original;
  const observed=new Map();
  const normalizeQuote=q=>{if(!q)return q;const row={...q,quoteAtMs:q.quoteAtMs??q.quoteObservation?.observedAtMs??q.updatedAtMs??Date.now()};if(row.ticker)observed.set(row.ticker,row);return row;};
  const normalizeBook=(b,t)=>{
    if(!b)return b;const q=normalizeQuote(original.getQuote?.(t))||observed.get(t);
    const out={...b,ticker:b.ticker??t,source:b.source??'REST',sequenceValid:b.sequenceValid??true};
    // Legacy mocks exposed executable sizes via methods instead of raw levels.
    // Populate ONLY missing fixture depth, never repair supplied incoherent data.
    if(q && !out.yesBids)out.yesBids=[{priceCents:q.yesBid,count:Number(original.executableBid?.(t,1_000_000,1)?.filled??0)}];
    if(q && !out.yesAsks && !out.noBids)out.noBids=[{priceCents:100-q.yesAsk,count:Number(original.executableAsk?.(t,1_000_000,99)?.filled??0)}];
    return out;
  };
  const bookFor=t=>{
    if(original.getBook)return normalizeBook(original.getBook(t),t);
    const q=normalizeQuote(original.getQuote?.(t))||observed.get(t);if(!q)return null;
    const ask=original.executableAsk?.(t,1_000_000,99),bid=original.executableBid?.(t,1_000_000,1);
    return {ticker:t,source:'REST',sequenceValid:true,updatedAtMs:q.quoteAtMs,
      yesBids:[{priceCents:q.yesBid,count:Number(bid?.filled??1000)}],
      noBids:[{priceCents:100-q.yesAsk,count:Number(ask?.filled??1000)}]};
  };
  return new Proxy(original,{get(target,key){
    if(key==='getQuote')return t=>normalizeQuote(target.getQuote?.(t))||observed.get(t);
    if(key==='getBook')return bookFor;
    if(['refreshTickerVerified','verifyTickerSnapshot'].includes(key)&&typeof target[key]==='function')return async(...args)=>{
      const r=await target[key](...args);if(!r)return r;
      if(r.marketFresh===false||r.bookFresh===false)return {...r,quote:normalizeQuote(r.quote)};
      return {...r,quote:normalizeQuote(r.quote),book:normalizeBook(r.book,args[0])||bookFor(args[0])};
    };
    if(key==='refreshTicker'&&typeof target[key]==='function')return async(...args)=>normalizeQuote(await target[key](...args));
    const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
}
export function completeFixtureDatabase(db,getSettings){
  if(!db||db.shadowArchitectureRequired===true)return db;
  db._shadowFixtureGetSettings=getSettings;
  const current=()=>db._shadowFixtureGetSettings();
  const rows=async()=>db.rows instanceof Map?[...db.rows.values()]:Array.isArray(db.rows)?db.rows:
    typeof db.entries==='function'?await db.entries(current().systemName):[];
  db.captureShadowScope??=async settings=>shadowScope(settings,1);
  db.insertShadowEntry??=async(entry,scope,{multiply=1,isCurrent=()=>true}={})=>{
    const s=current();
    if(!sameShadowScope(s,scope)||s.engineActive!==true||!isCurrent())throw new Error('shadow_runtime_fence_changed');
    const invalid=validateShadowEntry(entry);if(invalid)throw new Error(invalid);
    const all=await rows();
    if(all.some(e=>e.id===entry.id))return {ok:false,reason:'shadow_source_already_consumed'};
    const shadows=all.filter(e=>isShadowSaintEntry(e)&&sameShadowScope({...e,resetEpoch:e.shadowEpoch??e.entryConfig?.shadowSaint?.resetEpoch},scope));
    const event=entry.eventTicker||entry.ticker,ge=s.galacticExplosionEnabled===true;
    const maximum=Math.max(1,Math.floor(Number(s.maxEntriesPerTrade)||1),Math.floor(Number(multiply)||1));
    const used=shadows.filter(e=>(e.eventTicker||e.ticker)===event&&(!ge||e.conceptName===entry.conceptName)&&e.status!=='rejected');
    if(used.length>=maximum)return {ok:false,reason:'shadow_event_lifetime_cap'};
    const active=shadows.filter(e=>e.ticker===entry.ticker&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status));
    if(active.filter(e=>e.conceptName===entry.conceptName).length>=multiply||(!ge&&active.some(e=>e.conceptName!==entry.conceptName)))return {ok:false,reason:'shadow_ticker_duplicate'};
    if(!isCurrent())throw new Error('shadow_runtime_changed_before_commit');
    entry.shadowEpoch=scope.resetEpoch;entry.shadowRevision=1;entry.shadowState={};entry.shadowEntryHash=shadowEntryHash(entry);
    await db.insertEntry(entry);
    return {ok:true,entry,reason:'test_only_shadow_admission'};
  };
  return db;
}
export class FixtureStrategyEngine extends StrategyEngine {
  constructor(deps){
    if(!deps?.db||deps.db.shadowArchitectureRequired===true){super(deps);return;}
    super({...deps,db:completeFixtureDatabase(deps.db,deps.getSettings),market:completeFixtureMarket(deps.market)});
  }
}
export function asShadowFixture(entry,settings){
  return {...entry,systemName:entry.systemName??settings.systemName,ownerId:entry.ownerId??settings.ownerId,
    mode:entry.mode??settings.mode,executionClass:'SHADOW_SAINT',shadowEpoch:Number(settings.resetTimestampMs||0),
    entryConfig:{...entry.entryConfig,executionClass:'SHADOW_SAINT',shadowSaint:{...entry.entryConfig?.shadowSaint,resetEpoch:Number(settings.resetTimestampMs||0)}}};
}

// TEST ONLY: drive the actual virtual guard against existing in-memory journals.
// This deliberately does not replace the production PostgreSQL CAS/outbox test.
import { ProfitGuard, evaluateShadowWithOriginalGuard, verifyShadowEvaluationReceipt } from '../../src/profitGuard.mjs';
import { validateShadowObservation, shadowDanger } from '../../src/shadowProtocol.mjs';
export class FixtureProfitGuard extends ProfitGuard {
  constructor(deps){super(deps);this._fixtureDeps=deps;}
  async protect(entry){
    if(!isShadowSaintEntry(entry) || this._fixtureDeps.db.shadowArchitectureRequired===true)return super.protect(entry);
    const d=this._fixtureDeps,market=completeFixtureMarket(d.market);
    const observation={quote:structuredClone(market.getQuote(entry.ticker)),book:structuredClone(market.getBook(entry.ticker))};
    const evaluation=await evaluateShadowWithOriginalGuard(entry,observation,{settings:d.getSettings(),learning:d.learning,athena:d.athena});
    if(evaluation.deferred)return evaluation;
    if(!verifyShadowEvaluationReceipt(evaluation,entry,observation))throw new Error('invalid test virtual evaluation');
    const valid=validateShadowObservation(entry,observation,Date.now(),{allowSame:true});
    if(!valid.ok)throw new Error(valid.reason);
    const next=evaluation.nextEntry;
    next.shadowRevision=Number(entry.shadowRevision)+1;
    next.shadowState={...entry.shadowState,quoteAtMs:valid.quoteAtMs,bookAtMs:valid.bookAtMs,
      guardRuntime:evaluation.guardRuntime,quoteObservation:observation.quote.quoteObservation||null};
    if(!valid.settlement&&observation.quote.yesBid<=shadowDanger(entry))next.shadowState.hardStopTriggeredAtMs=entry.shadowState?.hardStopTriggeredAtMs||Date.now();
    await d.db.updateEntry(entry.id,next);
    if(evaluation.guardRuntime?.atomicThunder)this.atomicThunderStates.set(entry.id,evaluation.guardRuntime.atomicThunder);
    return {...evaluation.result,closed:evaluation.closed,virtual:true};
  }
}
export function shadowizeRows(db,settings){
  if(db.rows instanceof Map){for(const [id,e] of db.rows)db.rows.set(id,asShadowFixture(e,settings));}
  else if(Array.isArray(db.rows)){for(let i=0;i<db.rows.length;i++)db.rows[i]=asShadowFixture(db.rows[i],settings);}
  return db;
}

/** TEST ONLY: migrate old CAPITAL execution tests to the remaining real executor.
 * The fixture uses an explicitly pre-cutover, already-consumed-by-claim legacy
 * recovery watch. New shadow authorization is tested separately at the R3 store.
 * No production Database is eligible for this helper.
 */
export async function createStarlightCapitalFixture(strategy, quote, stakeCents, {athenaFireCommand}={}) {
  if(strategy.db.shadowArchitectureRequired===true)throw new Error('memory_fixture_only');
  const s=strategy.getSettings();
  Object.assign(s,{crashRecoveryHunterEnabled:true,crashRecoveryHunterLinkEnabled:true,
    crashRecoveryMinEntryCents:1,crashRecoveryMaxEntryCents:99,
    crashRecoveryStakeCents:stakeCents,crashRecoveryHunterAuroraDamageControlPercent:s.auroraDamageControlPercent,
    crashRecoveryHunterAthenaX1Enabled:false});
  const parentId=`LEGACY-CAPITAL-TEST:${athenaFireCommand?.boltId||quote.ticker}`;
  const watch={authorizationId:`STARLIGHT-RECOVERY:${parentId}`,parentEntryId:parentId,
    parentConcept:'Momentum Hunter',systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
    resetEpoch:Number(s.resetTimestampMs||0),ticker:quote.ticker,eventTicker:quote.eventTicker||quote.ticker,
    status:'EXECUTING',revision:1,link:true,stopPriceCents:Number(quote.yesAsk),armedAtMs:Date.now()-100,
    releaseAtMs:Date.now()-1,expiresAtMs:Number.MAX_SAFE_INTEGER};
  strategy.getCurrentStarlightWatch=id=>id===watch.authorizationId?watch:null;
  return strategy.createHunter('Crash Recovery Hunter',quote,stakeCents,0,{starlightRecovery:true,
    sourceTradeId:parentId,sourceFeeder:'Momentum Hunter',starlightRecoverySnapshot:watch,
    entryQualificationSnapshot:{boltId:athenaFireCommand?.boltId||parentId}});
}
