/** R17 MegaWave market-data scheduling policy. No order or broker authority.
 * All funded inventory is always pinned; only unfunded watches are bounded.
 * A cohort remains subscribed long enough to collect multiple real ticks.
 */
export const R17_FEED_POLICY=Object.freeze({
  maximumWatchedTickers:48,
  maximumTotalNonFundedTickers:80,
  minimumDiscoverySlots:8,
  legacyWatchCapacity:24,
  priorityMissingRestBudget:4,
  rotationIntervalMs:30_000,
  terminalProbeIntervalMs:60_000,
  quoteDrivenPageMinimumIntervalMs:250,
  fullPageIntervalMs:2_500,
  watchInterestLifetimeMs:15_000,
  // Bounded tick history per eligible ticker. On extraordinary overload,
  // carry a durable-in-this-process gap marker and require a fresh trend.
  quoteTapeMaximumPerTicker:256,
  quoteTapeMaximumTickers:512,
  priorityRestRecoveryTimeoutMs:2500,
  priorityRestRecoveryConcurrency:4,
});
const nonblank=x=>typeof x==='string'&&x.length>0&&x.length<=256;
// Only source tags assigned by the authenticated MarketHub REST/WS handlers
// are considered. An arbitrary strategy, dashboard or model source is never
// a terminal market proof. The database separately enforces this contract.
export const R17_TERMINAL_BROKER_SOURCES=Object.freeze([
  'REST','BROKER_REST','WS','WS_TICKER','WS_BOOK','LIFECYCLE'
]);
export const r17TerminalBrokerSource=source=>R17_TERMINAL_BROKER_SOURCES.includes(String(source||''));
export function terminalR17MarketEvidence(ticker,quote,{now=Date.now()}={}){
  const time=Number(quote?.quoteAtMs||quote?.updatedAtMs||quote?.quoteObservation?.observedAtMs||0);
  const status=String(quote?.status||'').toLowerCase();
  if(!nonblank(ticker)||quote?.ticker!==ticker
    ||!['settled','finalized'].includes(status)
    ||!['yes','no'].includes(String(quote?.result||'').toLowerCase())
    ||!Number.isSafeInteger(time)||time<=0||time>now+3_000
    ||!r17TerminalBrokerSource(quote?.quoteObservation?.source))return null;
  return {ticker,status,result:String(quote.result),observedAtMs:time,
    source:String(quote.quoteObservation.source),
    epoch:String(quote.quoteObservation.epoch||'').slice(0,120),
    revision:Number(quote.quoteObservation.revision||0)};
}
export function stableR17WatchWindow(tickers,{maximum=R17_FEED_POLICY.maximumWatchedTickers,cursor=0}={}){
  const unique=[...new Set(Array.from(tickers||[]).filter(nonblank))].sort();
  const cap=Math.max(1,Math.min(R17_FEED_POLICY.maximumWatchedTickers,Math.floor(Number(maximum)||1)));
  const first=unique.length?((Math.floor(Number(cursor)||0)%unique.length)+unique.length)%unique.length:0;
  const selected=[];
  for(let i=0;i<Math.min(cap,unique.length);i++)selected.push(unique[(first+i)%unique.length]);
  return {selected,total:unique.length,rotating:unique.length>cap,nextCursor:unique.length?(first+selected.length)%unique.length:0};
}
