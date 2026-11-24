/** R17 Golden Saints runtime: durable Athena-stop fan-out, isolated ten
 * Starlight-derived price watches, two loss-recovery stages, broker-fenced
 * execution. Legacy entry routes have NO new-capital insert authority.
 * No network request from a websocket callback or inside a PostgreSQL TX.
 */
import {REGULAR_SAINTS,ALL_SAINTS,R17_VERSION,r17ScopedId,
  r17SignalUsingOriginalStarlight,r17CardFingerprint,r17PersistedObservationQuote,saintRole} from './goldenSaintDomain.mjs';
import {createGoldenSaintCapitalEntry} from './goldenSaintCapital.mjs';
import {liveEntryDispatchBookConfirmation} from './liveEntryDispatchBook.mjs';
import {liveRecoveryCollateralRequirement} from './executionEconomics.mjs';
import {stampLiveEpoch} from './strategy.mjs';
import {R17_FEED_POLICY,terminalR17MarketEvidence} from './goldenSaintFeedPolicy.mjs';
import {isEntryAuthorizedGameClockState,normalizeGameClockState} from './gameClock.mjs';

const scopedSettings=s=>({systemName:s?.systemName,ownerId:s?.ownerId,
  mode:s?.mode,resetEpoch:Number(s?.resetTimestampMs||0)});
const refusals=new Set(['r17_watch_or_card_invalid','r17_market_identity_mismatch','r17_fresh_quote_spread_invalid']);
const validScope=(a,b)=>a?.systemName===b?.systemName&&a?.ownerId===b?.ownerId
  &&a?.mode===b?.mode&&Number(a?.resetEpoch)===Number(b?.resetEpoch);

export function regularWindowDecision(quote, settings, now=Date.now()){
  const event=String(quote?.eventTicker||quote?.ticker||'');
  const state=normalizeGameClockState(quote?.gameClockState,event);
  if(state?.phase==='FINAL')return {action:'BLOCK',reason:'game_final'};
  if(state?.phase==='CONFLICT')return {action:'BLOCK',reason:'game_clock_conflict'};
  const status=String(quote?.status||'').toLowerCase();
  if(quote?.result||['closed','determined','settled','finalized'].includes(status))
    return {action:'BLOCK',reason:'game_market_terminal'};
  const proven=state?.phase==='CONFIRMED'&&state.confirmed===true
    &&state.actualStartConfidence==='proven'&&Number(state.actualStartMs)>0;
  const bounded=state?.phase==='BOUNDED'&&state.confirmed===false
    &&state.actualStartConfidence==='bounded'
    &&Number(state.boundedStartLowerMs)>0
    &&Number(state.boundedStartUpperMs)>Number(state.boundedStartLowerMs);
  const scheduled=state?.phase==='SCHEDULE_LIVE'&&state.confirmed===false
    &&state.actualStartConfidence==='scheduled_estimate'
    &&state.source==='kalshi_milestone_schedule_fresh_live_reference'
    &&state.scheduleReferenceMilestoneId===state.milestoneId
    &&Number(state.scheduledStartMs)>0;
  if(!proven&&!bounded&&!scheduled)return {action:'BLOCK',reason:'live_start_unknown'};
  if(!isEntryAuthorizedGameClockState(state,event,now))
    return {action:'BLOCK',reason:'sporting_evidence_stale_or_unverified'};
  // Scheduled reference is an owner-authorized approximation, NEVER
  // an actual-start bracket. Report it distinctly to the trade ledger.
  const clockReference=scheduled?Number(state.scheduledStartMs):
    Number(bounded?state.boundedStartUpperMs:state.actualStartMs);
  const earliestElapsed=now-clockReference;
  const latestElapsed=now-Number(scheduled?state.scheduledStartMs:
    bounded?state.boundedStartLowerMs:state.actualStartMs);
  if(earliestElapsed< -2000)return {action:'BLOCK',reason:'actual_start_in_future'};
  const minMs=Math.max(0,Number(settings.minGameMinutes||0))*60_000;
  const maxMin=Math.max(0,Number(settings.maxGameMinutes||0));
  if(earliestElapsed+1e-9<minMs)
    return {action:'BLOCK',reason:'minimum_game_time_wait',
      nextEligibleAtMs:clockReference+minMs};
  if(maxMin>0&&latestElapsed-1e-9>maxMin*60_000)
    return {action:'BLOCK',reason:'maximum_game_time_exceeded'};
  return {action:'ALLOW',
    reason:scheduled?'scheduled_live_reference_entry_window':bounded?'bounded_sporting_start_entry_window':'confirmed_entry_window',
    startEvidence:scheduled?'matched_milestone_schedule_live_reference_estimate':bounded?'bounded_provider_status_transition':'explicit_actual_start',
    actualKickoffProven:proven,scheduledStartIsEstimate:scheduled};
}

const quotedNow=(quote)=>Number(quote?.quoteAtMs||quote?.updatedAtMs||quote?.quoteObservation?.observedAtMs||0);
function deny(reason){return {ok:false,reason};}

export class GoldenSaintRuntime {
  constructor(engine){
    if(!engine?.db?.goldenSaintStore||!engine?.market||!engine?.strategy||!engine?.kalshi)
      throw new Error('r17_runtime_native_dependencies_required');
    this.engine=engine;this.store=engine.db.goldenSaintStore;
    this.started=false;this.busy=false;this.timer=null;this.recoveryTimer=null;this.wakeTimer=null;this.wakeAtMs=0;
    this.activeTickers=new Set();this.watchInterest=new Map();
    this.pendingQuoteTickers=new Set();this.quoteSamples=new Map();
    this.quotePageLastAtMs=new Map();this.quotePageCursor=new Map();
    this.quotePageFailed=new Set();this.quoteTapeGap=new Map();
    // Admission proofs/claims run on a bounded independent lane. A slow REST
    // BUY preflight must not prevent all other Saints from observing quotes.
    this.executionQueue=new Map();this.executionInFlight=new Set();
    // A full bounded execution queue must not require a NEW market tick to
    // reconsider a still-valid authoritative WATCH after a slot frees.
    this.capacityWaitTickers=new Set();this.lastLiveAdmissionWakeAtMs=0;
    this.executionRunning=0;this.executionGeneration=0;
    this.clockRefreshPromises=new Map();this.clockRefreshMemo=new Map();
    this.cardRevalidationCursor=null;this.cardRevalidationScope='';this.cardRevalidationComplete=false;
    // The durable WATCHING record, not a second in-memory synthetic watch,
    // owns a qualified observation across temporary LIVE readiness gaps.
    // Revalidation below always uses the current authenticated MarketHub quote.
    this.pageCursor=null;this.recoveryCursor=null;this.forceFullPage=false;
    this.lastFullPageAtMs=0;this.recoveryBusy=false;this.terminalProbing=false;
    this.terminalProbeAtMs=new Map();this.lastTerminalProbeAtMs=0;
    this.lastTerminalProofs=new Map();this.tickAgain=false;
    this.lastRecoverySweepAtMs=0;this.lastNoSeatSweepAtMs=0;this.lastResult=null;
    this.stats={sweeps:0,opened:0,armed:0,denied:0,pending:0,
      recoveredAbandonedNoSeatClaims:0,terminalWatchesRetired:0,
      watchesRevalidated:0,watchRevalidationSkipped:0,clockProviderRefreshes:0,clockSharedRefreshes:0,
      quoteDrivenPages:0,fullPages:0,terminalProbes:0,
      quotesPreserved:0,quoteQueueOverflow:0,executionQueued:0,
      executionCompleted:0,executionErrors:0,executionQueueFull:0,lastError:null};
    // Bounded R17-specific eligibility evidence. The retired R16 entry
    // pipeline cannot establish LIVE/SIM parity for constellation attacks.
    this.decisionEvents=[];this.decisionKeys=new Set();this.decisionCounts={};
  }
  noteDecision(stage,reason,watch,quote=null){
    // Diagnostic only. Every event is a sampled decision/evaluation, not an
    // independent opportunity or an authenticated broker receipt.
    try{
      const observation=quote?.quoteObservation||{},key=JSON.stringify([
        watch?.authorizationId||'',String(stage||''),String(reason||''),
        String(observation.epoch||''),Number(observation.revision||0),
        Number(quote?.quoteAtMs||quote?.updatedAtMs||0)]);
      if(this.decisionKeys.has(key))return;
      this.decisionKeys.add(key);
      const progress=['strategy_qualified','queued_live_or_sim_execution','seat_reserved'].includes(String(reason));
      const retryable=/wait|refresh|stale|missing|unavailable|retry|not_ready|busy|unqualified|price_band|rise_unmet|crash_rebound_or_ticks/.test(String(reason));
      this.recordFunnel({candidateId:watch?.authorizationId,parentEntryId:watch?.parentEntryId,
        eventTicker:watch?.eventTicker||quote?.eventTicker,ticker:watch?.ticker||quote?.ticker,
        stage:'r17_'+String(stage||'stage'),status:progress?'progress':retryable?'wait':'refused',reason});
      if(this.decisionKeys.size>512)
        this.decisionKeys.delete(this.decisionKeys.values().next().value);
      const label=`${String(stage||'stage')}:${String(reason||'unknown')}`.slice(0,120);
      if(Object.keys(this.decisionCounts).length<64||Object.hasOwn(this.decisionCounts,label))
        this.decisionCounts[label]=Number(this.decisionCounts[label]||0)+1;
      this.decisionEvents.push({atMs:Date.now(),stage:String(stage||'').slice(0,45),
        reason:String(reason||'').slice(0,100),saint:String(watch?.saint||'').slice(0,32),
        ticker:String(watch?.ticker||'').slice(0,160),
        authorizationId:String(watch?.authorizationId||'').slice(0,100),
        cardFingerprint:String(watch?.cardFingerprint||'').slice(0,90),
        quoteAtMs:Number(quote?.quoteAtMs||quote?.updatedAtMs||0)||null,
        quoteEpoch:String(observation.epoch||'').slice(0,80),
        quoteRevision:Number(observation.revision||0),mode:this.scope().mode});
      if(this.decisionEvents.length>128)this.decisionEvents.shift();
    }catch{/* optional evidence may never block trading or protection */}
  }
  recordFunnel(event){
    try{this.engine.recordTradingFunnelStage?.({...event,atMs:Date.now()});}
    catch{/* optional diagnostics never change trading authority */}
  }
  decisionTraceSnapshot(){return {version:'R17-DECISION-TRACE-1',
    countingRule:'bounded deduplicated evaluation stages, NOT independent opportunities or fills',
    source:'R17 GoldenSaintRuntime',totalRetained:this.decisionEvents.length,
    byStageReason:{...this.decisionCounts},events:[...this.decisionEvents],
    limitations:['process_local_since_restart','no_historical_card_at_decision','not_matched_sim_live_tape']};}
  settings(){return this.engine.settings;}
  scope(){return scopedSettings(this.settings());}
  // Preserve the strategy's price/revision tape while consulting the current
  // same-event authority. Refreshes on another sibling must be immediately
  // reusable; copying a clock never renews its provider observation timestamp.
  regularClockQuote(quote){
    const event=String(quote?.eventTicker||quote?.ticker||'');
    const current=this.engine.market?.getQuote?.(quote?.ticker);
    if(current&&String(current.eventTicker||current.ticker||'')!==event)
      return {...quote,gameClockIdentityMismatch:true};
    const scopeKey=JSON.stringify(this.scope());
    const memo=this.clockRefreshMemo.get(event);
    const states=[this.engine.currentGameClockState?.(event),current?.gameClockState,
      quote?.gameClockState,memo?.scopeKey===scopeKey?memo.state:null]
      .map(raw=>normalizeGameClockState(raw,event)).filter(Boolean);
    // An explicit foreign-event state never grants authority to this market.
    if(states.some(state=>state.eventTicker!==event))
      return {...quote,gameClockIdentityMismatch:true};
    const observed=state=>Math.max(Number(state?.lastCheckedAtMs||0),
      Number(state?.liveStatusObservedAtMs||0),Number(state?.evidenceObservedAtMs||0));
    // Highest-level current authority wins ties. A later negative observation
    // supersedes an older success; an older failure cannot erase newer proof.
    let state=states[0]||null;
    for(const next of states.slice(1)){
      const later=observed(next)>observed(state);
      const terminalTie=observed(next)===observed(state)
        &&['FINAL','CONFLICT'].includes(next.phase)&&!['FINAL','CONFLICT'].includes(state?.phase);
      // A verified same-event final is irreversible. A later optimistic
      // quote must not resurrect it, even before a sibling broadcast catches up.
      if(state?.phase==='FINAL'&&next.phase!=='FINAL')continue;
      if(next.phase==='FINAL'||later||terminalTie)state=next;
    }
    return {...quote,
      ...(current?{status:current.status??quote?.status,result:current.result??quote?.result}:{}),
      gameClockState:state||quote?.gameClockState,
      gameStartTimeMs:state?.confirmed===true?Number(state.actualStartMs)||null:null};
  }
  regularClockDecision(quote,settings=this.settings(),now=Date.now()){
    const current=this.regularClockQuote(quote);
    return current.gameClockIdentityMismatch
      ?{action:'BLOCK',reason:'clock_event_identity_mismatch'}
      :regularWindowDecision(current,settings,now);
  }
  // Only qualified REGULAR capital entries request official data. All gates
  // consume the same inexpensive snapshot contract; network/SQL work happens
  // only when existing sporting evidence is missing or actually stale.
  async regularClockPreflight(quote){
    const scopeKey=JSON.stringify(this.scope()),now=Date.now();
    const applyCurrent=()=>{
      const current=this.regularClockQuote(quote);
      if(current.gameClockState){
        quote.gameClockState=current.gameClockState;
        quote.gameStartTimeMs=current.gameStartTimeMs;
      }
      return current.gameClockIdentityMismatch
        ?{action:'BLOCK',reason:'clock_event_identity_mismatch'}
        :regularWindowDecision(current,this.settings(),Date.now());
    };
    let decision=applyCurrent();
    if(decision.action==='ALLOW'||!this.engine?.refreshGameClockForQuote
      ||!['live_start_unknown','sporting_evidence_stale_or_unverified'].includes(decision.reason))
      return {decision,quote};
    const event=String(quote?.eventTicker||quote?.ticker||'');
    const key=JSON.stringify([scopeKey,event]);
    // Join an already running sibling lookup before applying retry pacing.
    // Pacing never suppresses a fresh result that became available meanwhile.
    let pending=this.clockRefreshPromises.get(key);
    if(pending)this.stats.clockSharedRefreshes++;
    if(!pending){
      const priorProbe=this.clockRefreshMemo.get(event);
      if(priorProbe?.scopeKey===scopeKey&&now<priorProbe.nextAtMs)
        return {decision,quote};
      const target=this.engine.market?.getQuote?.(quote?.ticker)||quote;
      this.stats.clockProviderRefreshes++;
      pending=Promise.resolve().then(()=>this.engine.refreshGameClockForQuote(target,
        {forceFresh:true,clockOnly:true})).catch(()=>null);
      this.clockRefreshPromises.set(key,pending);
      pending.finally(()=>{if(this.clockRefreshPromises.get(key)===pending)this.clockRefreshPromises.delete(key);});
    }
    const refreshed=await pending;
    if(scopeKey!==JSON.stringify(this.scope()))
      return {decision:{action:'BLOCK',reason:'clock_scope_changed'},quote};
    if(refreshed?.gameClockState){
      // The shared result is available to every sibling even with test/backward
      // compatible engines that have no in-memory event-authority accessor.
      const prior=this.clockRefreshMemo.get(event);
      this.clockRefreshMemo.set(event,{scopeKey,nextAtMs:prior?.nextAtMs||0,
        state:refreshed.gameClockState});
    }
    decision=applyCurrent();
    const retryMs=decision.action==='ALLOW'?0:
      decision.reason==='live_start_unknown'?10000:2000;
    const state=this.clockRefreshMemo.get(event)?.state||null;
    this.clockRefreshMemo.delete(event);
    this.clockRefreshMemo.set(event,{scopeKey,state,nextAtMs:Date.now()+retryMs});
    if(this.clockRefreshMemo.size>512)this.clockRefreshMemo.delete(this.clockRefreshMemo.keys().next().value);
    return {decision,quote};
  }
  async audit(event,fields){try{await this.engine.db.audit('info',`r17_${event}`,fields);}catch{}}
  onQuote(tickerOrQuote){
    const quote=tickerOrQuote&&typeof tickerOrQuote==='object'?tickerOrQuote:null;
    const key=String(quote?.ticker||tickerOrQuote||'');
    if(!this.started||!this.activeTickers.has(key))return;
    // Broker observation revisions must not disappear behind the original
    // 90ms wake coalescing: four distinct upward ticks can arrive within 90ms.
    // Bounded per-ticker queue is a *signal* tape, never execution-book proof.
    const observation=quote?.quoteObservation;
    if(quote&&Number.isSafeInteger(Number(observation?.revision))&&Number(observation.revision)>0
      &&String(observation.epoch||'')===String(this.engine.market?.quoteEpoch||'')){
      const existing=this.quoteSamples.get(key)||[];
      if(!existing.some(q=>Number(q.quoteObservation?.revision)===Number(observation.revision))){
        existing.push({...quote});
        // A bounded tape must not silently award upward ticks across missing
        // quotes. Record any overwritten revision as a trend discontinuity.
        if(existing.length>R17_FEED_POLICY.quoteTapeMaximumPerTicker){
          const dropped=existing.shift();
          const through=Number(dropped?.quoteObservation?.revision||0);
          this.quoteTapeGap.set(key,{epoch:String(dropped?.quoteObservation?.epoch||''),through});
          this.stats.quoteQueueOverflow++;
        }
        this.quoteSamples.set(key,existing);
        this.stats.quotesPreserved++;
        // Never evict a ticker that still has unprocessed durable quote tape.
        // The production active universe is smaller than this generous bound.
        if(this.quoteSamples.size>R17_FEED_POLICY.quoteTapeMaximumTickers)
          this.stats.lastError='r17_quote_tape_ticker_capacity_exceeded';
      }
    }
    this.pendingQuoteTickers.add(key);
    this.scheduleWake(90);
  }
  onGameClockEvidence(eventTicker){
    if(!this.started||this.engine.shuttingDown)return 0;
    const event=String(eventTicker||'');if(!event)return 0;
    let affected=0;
    for(const ticker of this.activeTickers){
      const quote=this.engine.market?.getQuote?.(ticker)||this.quoteSamples.get(ticker)?.at(-1);
      if(String(quote?.eventTicker||quote?.ticker||'')!==event)continue;
      this.pendingQuoteTickers.add(ticker);affected++;
    }
    // Reconsider the existing durable watches without requiring another price
    // tick. The reader still applies its per-ticker cooldown and page bounds.
    if(affected)this.requestTick();
    return affected;
  }
  async armAthena(parentId){
    const s=this.settings();if(!s||!parentId)return deny('r17_athena_arm_scope_invalid');
    const result=await this.store.armAthena(parentId,s);
    this.recordArmedOutcome('athena',result);
    this.stats.armed+=Number(result?.created||0);
    if(result?.created){this.forceFullPage=true;this.requestTick();}
    return result;
  }
  async armCapitalLoss(entry){
    if(!entry?.id||!String(entry.conceptName||'').startsWith('R17:'))return deny('r17_not_a_capital_saint');
    const s=this.settings();
    if(entry.systemName!==s.systemName||entry.ownerId!==s.ownerId||entry.mode!==s.mode
       ||Number(entry.shadowEpoch)!==Number(s.resetTimestampMs||0))return deny('r17_loss_scope_changed');
    const result=await this.store.armCapitalLoss(entry.id,s);
    this.recordArmedOutcome('recovery',result,entry);
    if(result?.created){this.forceFullPage=true;this.requestTick();}
    return result;
  }
  recordArmedOutcome(kind,result,parent=null){
    if(result?.ok!==true)return;
    const identity={eventTicker:result.eventTicker||parent?.eventTicker,
      ticker:result.ticker||parent?.ticker};
    if(kind==='athena'){
      this.recordFunnel({...identity,candidateId:result.parentEntryId,
        stage:'athena_stop_verified',status:'progress',reason:'native_shadow_hard_stop_verified'});
      for(const watch of result.watches||[])this.recordFunnel({...identity,
        candidateId:watch.authorizationId,parentEntryId:result.parentEntryId,
        stage:watch.created?'regular_watch_created':'regular_watch_existing',
        status:'progress',reason:watch.created?'native_unique_watch_committed':'native_existing_authorization'});
    }else{
      this.recordFunnel({...identity,candidateId:result.parentEntryId,parentEntryId:parent?.sourceTradeId,
        stage:'capital_position_closed_verified',status:'progress',reason:'native_reconciled_parent_closed'});
      this.recordFunnel({...identity,candidateId:result.parentEntryId,parentEntryId:parent?.sourceTradeId,
        stage:'capital_net_loss_verified',status:'progress',reason:'native_reconciled_net_loss'});
      if(['Aquarius','Pisces'].includes(result.nextSaint))this.recordFunnel({...identity,candidateId:result.authorizationId,parentEntryId:result.parentEntryId,
        stage:result.created?(result.nextSaint==='Aquarius'?'aquarius_authorized':'pisces_authorized'):'recovery_watch_existing',
        status:'progress',reason:result.created?'native_unique_recovery_watch_committed':'native_existing_authorization'});
    }
  }
  start(){
    if(this.started)return;
    this.started=true;this.executionGeneration++;
    this.timer=setInterval(()=>{void this.tick();},R17_FEED_POLICY.fullPageIntervalMs);
    this.timer.unref?.();
    // Crash recovery/history replay is independent of the market-quote path.
    // A slow historical SQL reader must not delay a 4-up-tick signal.
    this.recoveryTimer=setInterval(()=>{void this.replayRecoveryLane();},5000);
    this.recoveryTimer.unref?.();
    void this.replayRecoveryLane();this.requestTick();
  }
  stop(){
    this.started=false;clearInterval(this.timer);this.timer=null;
    clearInterval(this.recoveryTimer);this.recoveryTimer=null;
    if(this.wakeTimer)clearTimeout(this.wakeTimer);
    this.wakeTimer=null;this.wakeAtMs=0;this.activeTickers.clear();this.watchInterest.clear();
    this.pendingQuoteTickers.clear();this.quoteSamples.clear();
    this.quotePageLastAtMs.clear();this.quotePageCursor.clear();
    this.quotePageFailed.clear();this.quoteTapeGap.clear();
    this.executionQueue.clear();this.capacityWaitTickers.clear();this.executionGeneration++;
    this.pageCursor=null;this.recoveryCursor=null;this.forceFullPage=false;
    this.clockRefreshPromises.clear();this.clockRefreshMemo.clear();
    this.cardRevalidationCursor=null;this.cardRevalidationScope='';this.cardRevalidationComplete=false;
    this.terminalProbeAtMs.clear();this.lastTerminalProofs.clear();
    this.engine.market?.setR17WatchTickers?.([]);
  }
  // Earliest deadline wins: a ticker that becomes due while another ticker
  // is cooling down must not inherit the previous ticker's 250ms wait.
  // Coalescing still ensures only one wake timer exists per runtime.
  scheduleWake(delayMs){
    if(!this.started||this.engine.shuttingDown)return;
    const delay=Math.max(0,Math.ceil(delayMs));
    const dueAt=Date.now()+delay;
    if(this.wakeTimer&&this.wakeAtMs<=dueAt)return;
    if(this.wakeTimer)clearTimeout(this.wakeTimer);
    this.wakeAtMs=dueAt;
    this.wakeTimer=setTimeout(()=>{
      this.wakeTimer=null;this.wakeAtMs=0;void this.tick();
    },delay);
    this.wakeTimer.unref?.();
  }
  requestTick(){if(!this.started)return;
    if(this.busy){this.tickAgain=true;return;}
    this.scheduleWake(0);
  }
  requestQuotePageAfter(delayMs){this.scheduleWake(Math.max(1,delayMs));}
  onLiveAdmissionRestored(){
    if(!this.started||this.scope().mode!=='LIVE')return false;
    // Coalesce changes from protection and account refresh into one prompt
    // reconsideration. Do not start a 250ms SQL polling loop while disarmed.
    const now=Date.now();
    if(now-this.lastLiveAdmissionWakeAtMs<1000)return false;
    this.lastLiveAdmissionWakeAtMs=now;
    if(!this.activeTickers.size)this.forceFullPage=true;
    else for(const ticker of this.activeTickers)this.pendingQuoteTickers.add(ticker);
    this.requestTick();return true;
  }
  // No duplicated deferred-qualification objects or broker intents. A WATCHING
  // row already retains source-authenticated observation provenance and full
  // strategy geometry. If LIVE is temporarily unavailable, periodic scoped
  // pages reconsider the SAME durable row without requiring a new quote tick.
  // This also works after restart, once MarketHub has fresh authenticated
  // evidence. Expired/changed/terminal evidence never mints a BUY intent.
  currentQuoteMatchesPersistedWatch(watch,raw,epoch){
    const saved=r17PersistedObservationQuote(watch);
    const obs=raw?.quoteObservation||{},prior=saved?.quoteObservation||{};
    return Boolean(saved&&raw&&String(raw.ticker||'')===String(watch.ticker)
      &&String(raw.eventTicker||raw.ticker||'')===String(watch.eventTicker)
      &&String(obs.epoch||'')===epoch&&String(prior.epoch||'')===epoch
      &&Number(obs.revision)===Number(prior.revision)
      &&Number(obs.receivedAtMs)===Number(prior.receivedAtMs)
      &&Number(raw.quoteAtMs||raw.updatedAtMs||0)===Number(saved.quoteAtMs)
      &&Number(raw.yesBid)===Number(saved.yesBid)
      &&Number(raw.yesAsk)===Number(saved.yesAsk));
  }
  queueExecution(watch,card,quote,scope){
    if(!this.started||this.engine.shuttingDown||!validScope(scope,this.scope()))return false;
    const key=String(watch?.authorizationId||'');
    if(!key||this.executionQueue.has(key)||this.executionInFlight.has(key))return false;
    if(this.executionQueue.size>=48){
      this.stats.executionQueueFull++;
      if(watch?.ticker)this.capacityWaitTickers.add(String(watch.ticker));
      return false;
    }
    this.executionQueue.set(key,{watch,card,quote,scope,generation:this.executionGeneration});
    this.stats.executionQueued++;this.drainExecutionQueue();return true;
  }
  drainExecutionQueue(){
    if(!this.started||this.engine.shuttingDown||!this.engine.running)return;
    while(this.executionRunning<2&&this.executionQueue.size){
      const [key,item]=this.executionQueue.entries().next().value;
      this.executionQueue.delete(key);this.executionInFlight.add(key);
      this.executionRunning++;
      void Promise.resolve().then(async()=>{
        if(!this.started||item.generation!==this.executionGeneration
          ||!validScope(item.scope,this.scope()))return deny('r17_execution_generation_changed');
        // executeWatch always performs a FRESH broker book/cash verification.
        // A queued price observation is NEVER treated as execution authority.
        return this.executeWatch(item.watch,item.card,item.quote,item.scope,item.generation);
      }).then(result=>{
        this.noteDecision('entry_result',result?.ok?'seat_reserved':result?.reason||'not_reserved',
          item.watch,item.quote);
      }).catch(error=>{
        this.stats.executionErrors++;
        this.stats.lastError=String(error?.message||error).slice(0,200);
        void this.audit('entry_lane_failure',{reason:this.stats.lastError});
      }).finally(()=>{
        this.stats.executionCompleted++;
        this.executionRunning--;this.executionInFlight.delete(key);
        // Do not launch another task in a stopped or changed generation.
        this.drainExecutionQueue();
        if(this.started&&this.capacityWaitTickers.size&&this.executionQueue.size<48){
          for(const ticker of this.capacityWaitTickers)this.pendingQuoteTickers.add(ticker);
          this.capacityWaitTickers.clear();this.requestTick();
        }
      });
    }
  }
  async replayRecoveryLane(){
    if(!this.started||this.recoveryBusy||this.engine.shuttingDown||!this.engine.running)return;
    this.recoveryBusy=true;const scope=this.scope();
    try{
      await this.replayAbandonedNoSeatClaims(scope);
      if(validScope(scope,this.scope()))await this.replayMissedRecoveryArms(scope);
      if(validScope(scope,this.scope()))await this.revalidateChangedWatchCards(scope);
    }catch(error){
      this.stats.lastError=String(error?.message||error).slice(0,200);
      void this.audit('recovery_lane_failure',{reason:this.stats.lastError});
    }finally{this.recoveryBusy=false;}
  }
  // Settings edits reconcile only zero-seat watches in the existing bounded
  // recovery lane. An optional repair transaction cannot hold up quote pages,
  // execution-book work, or protective exits.
  async revalidateChangedWatchCards(scope){
    if(typeof this.store.revalidateUnseatedWatches!=='function')return;
    const cards=this.settings().goldenSaints||{};
    const signature=JSON.stringify([scope,ALL_SAINTS.map(saint=>[
      saint,cards[saint]?.enabled===true?r17CardFingerprint(cards[saint]):null])]);
    if(signature!==this.cardRevalidationScope){
      this.cardRevalidationScope=signature;this.cardRevalidationCursor=null;this.cardRevalidationComplete=false;
    }
    if(this.cardRevalidationComplete)return;
    const result=await this.store.revalidateUnseatedWatches(scope,
      {after:this.cardRevalidationCursor,limit:40,now:Date.now()});
    if(!validScope(scope,this.scope())||signature!==this.cardRevalidationScope)return;
    this.cardRevalidationCursor=result?.morePossible?result.nextCursor:null;
    this.cardRevalidationComplete=result?.ok===true&&result.morePossible!==true;
    this.stats.watchesRevalidated+=Number(result?.revalidated||0);
    this.stats.watchRevalidationSkipped+=Number(result?.skipped||0);
    if(Number(result?.revalidated)>0){
      this.forceFullPage=true;this.requestTick();
      await this.audit('unseated_watch_cards_revalidated',{
        revalidated:Number(result.revalidated),skipped:Number(result.skipped||0),
        resetEpoch:scope.resetEpoch,mode:scope.mode});
    }
  }
  /** At most four global low-priority REST market checks per minute, only for WATCHING
   * tickers lacking any quote. No probe is awaited in the LIVE price loop.
   * A positive terminal broker result may persist an irreversible BLOCKED
   * watch tombstone; missing/failed REST is never treated as terminal.
   */
  requestTerminalProbe(scope,ticker){
    if(!this.started||this.terminalProbing||!validScope(scope,this.scope()))return;
    const now=Date.now(),last=Number(this.terminalProbeAtMs.get(ticker)||0);
    if(now-last<R17_FEED_POLICY.terminalProbeIntervalMs
      ||now-this.lastTerminalProbeAtMs<15_000)return;
    this.terminalProbing=true;this.lastTerminalProbeAtMs=now;
    this.terminalProbeAtMs.set(ticker,now);
    if(this.terminalProbeAtMs.size>1024)this.terminalProbeAtMs.delete(this.terminalProbeAtMs.keys().next().value);
    void Promise.resolve().then(async()=>{
      const budget=R17_FEED_POLICY.priorityRestRecoveryTimeoutMs;
      let timeout=null;
      const timeoutResult=new Promise(resolve=>{
        timeout=setTimeout(()=>resolve(null),budget);timeout.unref?.();
      });
      let quote;
      try{
        quote=await Promise.race([
          Promise.resolve().then(()=>this.engine.kalshi.getMarket(ticker,
            {deadline:performance.now()+budget})).catch(()=>null),
          timeoutResult]);
      }finally{clearTimeout(timeout);}
      if(!this.started||!validScope(scope,this.scope())||quote?.ticker!==ticker)return;
      const brokerQuote={...quote,quoteAtMs:Date.now(),
        quoteObservation:{source:'BROKER_REST',epoch:String(this.engine.market?.quoteEpoch||'')}};
      const proof=terminalR17MarketEvidence(ticker,brokerQuote);
      if(proof)await this.retireTerminalTicker(scope,ticker,proof);
      else if(String(quote.status||'').toLowerCase()==='active')this.engine.market?.seed?.(quote);
      this.stats.terminalProbes++;
    }).catch(error=>{void this.audit('terminal_probe_failed',{reason:String(error?.message||error).slice(0,110)});})
      .finally(()=>{this.terminalProbing=false;});
  }
  async retireTerminalTicker(scope,ticker,proof){
    if(!this.started||!validScope(scope,this.scope()))return;
    if(typeof this.store.retireTerminalWatches!=='function')return;
    const result=await this.store.retireTerminalWatches(scope,{ticker,proof});
    this.stats.terminalWatchesRetired+=Number(result?.retired||0);
    this.lastTerminalProofs.set(ticker,{proof,atMs:Date.now()});
    if(this.lastTerminalProofs.size>256)this.lastTerminalProofs.delete(this.lastTerminalProofs.keys().next().value);
    this.watchInterest.delete(ticker);this.activeTickers.delete(ticker);
    this.engine.market?.setR17WatchTickers?.([...this.activeTickers]);
  }
  async replayAbandonedNoSeatClaims(scope){
    const now=Date.now();
    if(now-this.lastNoSeatSweepAtMs<10_000)return;
    if(typeof this.store.reclaimAbandonedNoSeatClaims!=='function')
      throw new Error('r17_native_claim_recovery_reader_required');
    // An already reserved seat is a potentially sent broker intent; only
    // PostgreSQL-proven NO-SEAT claims are ever eligible to reopen.
    const result=await this.store.reclaimAbandonedNoSeatClaims(scope,
      {minAgeMs:45000,limit:16,now});
    this.lastNoSeatSweepAtMs=Date.now();
    this.stats.recoveredAbandonedNoSeatClaims+=Number(result.recovered||0);
    if(result.recovered){this.cardRevalidationComplete=false;this.cardRevalidationCursor=null;}
    if(result.recovered)await this.audit('abandoned_no_seat_claim_reopened',
      {count:result.recovered,ownerScope:scope.mode});
  }
  async replayMissedRecoveryArms(scope){
    const now=Date.now();
    // Immediate post-close callbacks are primary. A bounded 10-second native
    // outbox replay covers crash/network gaps; it never blindly resends BUYs.
    if(now-this.lastRecoverySweepAtMs<10_000)return;
    if(typeof this.store.pendingRecoverableLosses!=='function')
      throw new Error('r17_recovery_replay_reader_required');
    const ids=await this.store.pendingRecoverableLosses(scope,{after:this.recoveryCursor,limit:80});
    // Update the clock only after a successful database read. A failed read
    // must not suppress replay for an entire interval.
    this.lastRecoverySweepAtMs=now;
    this.recoveryCursor=ids.length===80?ids[ids.length-1]:null;
    for(const entryId of ids){
      if(!validScope(scope,this.scope())||!this.started||this.engine.shuttingDown)break;
      try{const saved=await this.store.armCapitalLoss(entryId,this.settings());
        this.recordArmedOutcome('recovery',saved);
        if(saved?.created)this.stats.armed++;}
      catch(error){this.stats.denied++;await this.audit('recovery_replay_denied',
        {parentId:entryId,reason:String(error?.message||error).slice(0,160)});}
    }
  }
  async tick(){
    if(!this.started||this.engine.shuttingDown||!this.engine.running)return;
    if(this.busy){this.tickAgain=true;return;}
    const settings=this.settings(),scope=scopedSettings(settings);
    if(settings.engineActive!==true||!['LIVE','SIMULATION'].includes(scope.mode))return;
    this.busy=true;
    // Track attempted quote pages outside the try block: a failed PostgreSQL
    // read must not erase the pending ticker that triggered it.
    const selectedTickerReads=new Set();
    try{
      // Stable input tape for this tick: quotes received during a slow query
      // are handled in the next iteration, not silently dropped.
      const tickQuoteSnapshot=new Map([...this.quoteSamples].map(([t,arr])=>
        [t,arr.length?Number(arr[arr.length-1]?.quoteObservation?.revision||0):0]));
      const now=Date.now();
      const fullDue=this.forceFullPage===true
        ||now-this.lastFullPageAtMs>=R17_FEED_POLICY.fullPageIntervalMs;
      // No periodic full scope DB read outside the timer or a newly armed
      // authorization. Spurious wakeups cannot start duplicate scans.
      if(!fullDue&&!this.pendingQuoteTickers.size)return;
      let watches=[];
      const enabledFingerprints=Object.fromEntries(ALL_SAINTS.flatMap(saint=>{
        const card=settings.goldenSaints?.[saint];
        return card?.enabled===true?[[saint,r17CardFingerprint(card)]]:[];
      }));
      let completeScopePage=false;
      let quoteDriven=false,completedTickers=new Set(),earliestCooldown=Infinity;
      if(fullDue){
        const cursorBefore=this.pageCursor;
        watches=await this.store.page(scope,
          {limit:500,after:cursorBefore,enabledFingerprints});
        this.pageCursor=watches.length===500?watches[watches.length-1].authorizationId:null;
        completeScopePage=!cursorBefore&&watches.length<500;
        this.lastFullPageAtMs=Date.now();this.forceFullPage=false;this.stats.fullPages++;
      }else{
        // Per-ticker 250ms SQL cooldown. A new quote remains in memory until
        // its next fair read; duplicates do not cause 12 identical SQL reads.
        const due=[];
        for(const ticker of [...this.pendingQuoteTickers]){
          if(due.length>=8)break;
          const elapsed=now-Number(this.quotePageLastAtMs.get(ticker)||0);
          if(elapsed<R17_FEED_POLICY.quoteDrivenPageMinimumIntervalMs){
            earliestCooldown=Math.min(earliestCooldown,
              R17_FEED_POLICY.quoteDrivenPageMinimumIntervalMs-elapsed);
            continue;
          }
          due.push(ticker);selectedTickerReads.add(ticker);
          this.pendingQuoteTickers.delete(ticker);
        }
        if(due.length){
          quoteDriven=true;
          for(const ticker of due){
            const cursor=this.quotePageCursor.get(ticker)||null;
            // A full-ticker replay starts from the first watch. Any previous
            // conflict has to be rechecked against PostgreSQL before the tape
            // can be acknowledged, including rows earlier than a page cursor.
            if(!cursor)this.quotePageFailed.delete(ticker);
            const page=await this.store.page(scope,
              {ticker,limit:500,after:cursor,enabledFingerprints});
            watches.push(...page);
            this.quotePageLastAtMs.set(ticker,Date.now());
            if(page.length===500){
              this.quotePageCursor.set(ticker,page.at(-1).authorizationId);
              this.pendingQuoteTickers.add(ticker);
              earliestCooldown=Math.min(earliestCooldown,R17_FEED_POLICY.quoteDrivenPageMinimumIntervalMs);
            }else{
              this.quotePageCursor.delete(ticker);
              completedTickers.add(ticker);
            }
          }
          this.stats.quoteDrivenPages++;
        }else{
          // Suppress empty cooldown polls; the timer wakes the actual due work.
          if(Number.isFinite(earliestCooldown))
            this.requestQuotePageAfter(earliestCooldown);
          return;
        }
      }
      if(!this.started||!validScope(scope,this.scope()))return;
      const staleBefore=Date.now()-R17_FEED_POLICY.watchInterestLifetimeMs;
      for(const [ticker,at] of this.watchInterest)
        if(at<staleBefore)this.watchInterest.delete(ticker);
      const watchTickers=[];
      for(const watch of watches){
        const card=this.settings().goldenSaints?.[watch.saint];
        if(watch.status==='WATCHING'&&card?.enabled===true
          &&r17CardFingerprint(card)===watch.cardFingerprint&&watch.ticker){
          this.watchInterest.set(watch.ticker,Date.now());watchTickers.push(watch.ticker);
        }
      }
      // A complete first page is authoritative for its scope. When there are
      // >500 watches, rolling interest TTL and the SQL cursor cover all pages.
      if(completeScopePage){
        const current=new Set(watchTickers);
        for(const ticker of this.watchInterest)if(!current.has(ticker))this.watchInterest.delete(ticker);
      }
      this.activeTickers=new Set(this.watchInterest.keys());
      // An inactive ticker cannot leave stale per-observation data occupying
      // a bounded market tape or repeated quote-driven SQL queue.
      for(const ticker of this.quoteSamples.keys())
        if(!this.activeTickers.has(ticker)){
          this.quoteSamples.delete(ticker);this.quoteTapeGap.delete(ticker);
          this.quotePageCursor.delete(ticker);this.quotePageFailed.delete(ticker);
          this.quotePageLastAtMs.delete(ticker);
        }
      for(const ticker of this.pendingQuoteTickers)
        if(!this.activeTickers.has(ticker))this.pendingQuoteTickers.delete(ticker);
      this.engine.market?.setR17WatchTickers?.([...this.activeTickers]);
      const provenTerminal=new Set(),retryTickers=new Set();
      // Every WATCHING row is a durable reconsideration candidate. SQL page
      // visibility and the quote's real provenance replace a fragile 32-slot
      // in-memory deferred queue. No additional scan beyond the existing page.
      for(const w of watches){
        if(!this.started||!validScope(scope,this.scope())||this.settings().engineActive!==true)break;
        if(w.status!=='WATCHING'||!validScope(w.scope,scope)
          ||Number(w.retryNotBeforeMs||0)>Date.now())continue;
        const card=this.settings().goldenSaints?.[w.saint];
        if(!card||card.enabled!==true||r17CardFingerprint(card)!==w.cardFingerprint){
          this.noteDecision('card','disabled_or_fingerprint_mismatch',w);continue;
        }
        if(provenTerminal.has(w.ticker))continue;
        const priorTerminal=this.lastTerminalProofs.get(w.ticker)?.proof;
        if(priorTerminal){
          provenTerminal.add(w.ticker);
          await this.retireTerminalTicker(scope,w.ticker,priorTerminal);
          continue;
        }
        const q=this.engine.market.getQuote?.(w.ticker)
          ||this.quoteSamples.get(w.ticker)?.at(-1)||null;
        if(!q){
          this.noteDecision('quote','market_snapshot_missing',w);
          this.requestTerminalProbe(scope,w.ticker);continue;
        }
        const terminal=terminalR17MarketEvidence(w.ticker,q);
        if(terminal){
          provenTerminal.add(w.ticker);
          await this.retireTerminalTicker(scope,w.ticker,terminal);
          this.noteDecision('market','broker_verified_terminal',w,q);continue;
        }
        // One terminal market may have more than forty associated watches;
        // subsequent sweeps complete cleanup under the same durable proof.
        const epoch=String(this.engine.market.quoteEpoch||'');
        const boundary=tickQuoteSnapshot.get(w.ticker);
        const buffered=(this.quoteSamples.get(w.ticker)||[]).filter(x=>
          boundary!=null&&Number(x.quoteObservation?.revision||0)<=boundary);
        const qRevision=Number(q.quoteObservation?.revision||0);
        // CRITICAL: do not jump to a quote delivered during the SQL wait.
        // Its intermediate revisions remain on the per-ticker tape and are
        // replayed on the next tick in exactly the received order.
        const arrivals=[...buffered,...(qRevision>0&&(boundary==null||qRevision<=boundary)?[q]:[])];
        const ordered=arrivals.filter(item=>item&&item.ticker===w.ticker
          &&String(item.quoteObservation?.epoch||'')===epoch
          &&Number(item.quoteObservation?.revision||0)>0)
          .sort((a,b)=>Number(a.quoteObservation.revision)-Number(b.quoteObservation.revision));
        let updated=w,stamped=null;
        const visited=new Set();
        const gap=this.quoteTapeGap.get(w.ticker);
        let gapHandled=false;
        for(const item of ordered){
          const revision=Number(item.quoteObservation.revision);
          if(visited.has(revision)||revision<=Number(w.lastQuoteRevision||0)
            &&String(w.lastQuoteEpoch||'')===epoch)continue;
          visited.add(revision);
          const sample=stampLiveEpoch({...item},epoch);
          // After a bounded-tape overflow, restart the trend with a fresh
          // baseline price. Never award synthetic 'consecutive' ticks across
          // a gap; still retain valid broker quote and downward evidence.
          if(!gapHandled&&gap?.epoch===epoch
            &&Number(w.lastQuoteRevision||0)<gap.through){
            updated={...updated,upwardTicks:0,lastBidCents:Number(sample.yesBid)};
            gapHandled=true;
            this.noteDecision('quote','observation_gap_trend_reset',w,sample);
          }
          const signal=r17SignalUsingOriginalStarlight({watch:updated,quote:sample,card,
            now:Date.now(),advance:true,liveEpoch:epoch});
          if(!signal.ok||!signal.signal){
            this.noteDecision('signal',signal.reason||'signal_invalid',w,sample);continue;
          }
          updated=signal.signal;stamped=sample;
        }
        let saved=null;
        if(stamped){
          // A genuine new quote observation needs a durable revision commit
          // before it can qualify for any broker/seat admission.
          if(Number(updated.lastQuoteAtMs||0)===Number(w.lastQuoteAtMs||0)
            &&updated.lastQuoteEpoch===w.lastQuoteEpoch
            &&Number(updated.lastQuoteRevision||0)===Number(w.lastQuoteRevision||0))continue;
          try{saved=await this.store.persistObserved({...updated,status:'WATCHING'},w.revision);}
          catch(error){
            this.noteDecision('persistence','observation_write_retry',w,stamped);
            this.stats.lastError=String(error?.message||error).slice(0,200);
          }
          if(!saved||!validScope(scope,this.scope())){
            retryTickers.add(w.ticker);this.quotePageFailed.add(w.ticker);continue;
          }
        }else{
          // No new revision: revisit the full AUTHORITATIVE durable watch,
          // NEVER a truncated synthetic watch. This is a qualification
          // reconsideration, not a new upward tick, broker order, or fill.
          const current=this.engine.market.getQuote?.(w.ticker);
          if(!this.currentQuoteMatchesPersistedWatch(w,current,epoch))continue;
          stamped=stampLiveEpoch({...current},epoch);
          saved=w;
        }
        const final=r17SignalUsingOriginalStarlight({watch:saved,quote:stamped,card,
          now:Date.now(),advance:false,liveEpoch:epoch});
        if(!final.ok||!final.signal?.qualified){
          this.noteDecision('qualification',final.signal?.reason||final.reason||'unqualified',saved,stamped);continue;
        }
        this.noteDecision('qualification','strategy_qualified',saved,stamped);
        if(scope.mode==='LIVE'&&this.liveExecutionReady()!==true){
          // Keep WATCHING and its complete durable, source-authenticated
          // qualification intact. The ordinary 2.5s scoped scan (or a new
          // real quote) will reconsider it once current LIVE readiness is
          // restored. Do NOT poll SQL every 250ms while disarmed.
          this.noteDecision('live_gate',this.engine.goldSaintLiveAdmission?.()?.reason||'runtime_not_ready',saved,stamped);
          this.engine.requestGoldSaintAccountRefresh?.();
          continue;
        }
        if(this.queueExecution(saved,card,stamped,scope))
          this.noteDecision('entry_lane','queued_live_or_sim_execution',saved,stamped);
        else this.noteDecision('entry_lane','execution_lane_busy_or_stopped_retryable',saved,stamped);
      }
      // A successful WATCHING page has consumed each included quote revision.
      // Quotes that arrived while PostgreSQL was busy remain queued for the
      // immediate follow-up tick; old observations are never broker receipts.
      const touched=new Set(watches.map(w=>w.ticker).filter(Boolean));
      // Consume a ticker's revisions only after every eligible watch has
      // persisted the same revision boundary. In 500-row scopes/tickers,
      // the cursor must exhaust before releasing any history.
      for(const ticker of touched){
        const pageComplete=quoteDriven?completedTickers.has(ticker):completeScopePage;
        if(!pageComplete||this.quotePageFailed.has(ticker)||retryTickers.has(ticker))continue;
        const samples=this.quoteSamples.get(ticker);
        if(!samples?.length)continue;
        const cursor=Number(tickQuoteSnapshot.get(ticker)||0);
        if(!cursor)continue;
        const remaining=samples.filter(x=>Number(x.quoteObservation?.revision||0)>cursor);
        if(remaining.length)this.quoteSamples.set(ticker,remaining);
        else this.quoteSamples.delete(ticker);
        const gap=this.quoteTapeGap.get(ticker);
        if(gap&&gap.through<=cursor)this.quoteTapeGap.delete(ticker);
        this.quotePageFailed.delete(ticker);
      }
      for(const ticker of retryTickers){
        this.quotePageCursor.delete(ticker);
        this.pendingQuoteTickers.add(ticker);
      }
      this.stats.sweeps++;
    }catch(error){
      this.stats.lastError=String(error?.message||error).slice(0,200);
      this.stats.denied++;void this.audit('sweep_failure',{reason:this.stats.lastError});
      for(const ticker of selectedTickerReads){
        this.quotePageCursor.delete(ticker);
        this.quotePageFailed.add(ticker);
        this.pendingQuoteTickers.add(ticker);
        this.quotePageLastAtMs.set(ticker,Date.now());
      }
    }finally{
      this.busy=false;
      if(this.tickAgain||this.pendingQuoteTickers.size){
        this.tickAgain=false;
        const now=Date.now();
        const anyReady=[...this.pendingQuoteTickers].some(t=>
          now-Number(this.quotePageLastAtMs.get(t)||0)>=R17_FEED_POLICY.quoteDrivenPageMinimumIntervalMs);
        if(anyReady)this.requestTick();
        else if(this.pendingQuoteTickers.size){
          const delay=Math.min(...[...this.pendingQuoteTickers].map(t=>
            Math.max(1,R17_FEED_POLICY.quoteDrivenPageMinimumIntervalMs-
              (now-Number(this.quotePageLastAtMs.get(t)||0)))));
          this.requestQuotePageAfter(delay);
        }
      }
    }
  }
  // Keep backward-compatible synthetic replay contracts, but use the
  // narrowly scoped, source-authoritative qualified-admission decision on
  // production SagittariusEngine instances.
  liveExecutionReady(){
    return typeof this.engine.isGoldSaintLiveReady==='function'
      ?this.engine.isGoldSaintLiveReady():this.engine.isLiveReady()===true;
  }
  async releaseUnseatedClaim(scope,claim){
    const result=await this.store.releaseClaimNoSend(scope,claim.authorizationId,claim.revision).catch(()=>null);
    const current=this.settings().goldenSaints?.[claim.saint];
    if(result?.ok&&current&&r17CardFingerprint(current)!==claim.cardFingerprint){
      this.cardRevalidationComplete=false;this.cardRevalidationCursor=null;
    }
    return result;
  }
  async executeWatch(watch,card,q,scope,generation=null){
    if(!validScope(scope,this.scope())||this.settings().engineActive!==true
      ||(generation!==null&&generation!==this.executionGeneration))return deny('r17_scope_changed');
    // Strategy eligibility is identical in SIM and LIVE. Only the existing
    // owner-authorized LIVE readiness and authenticated broker admission
    // differ; no independently configured R17 release switch is consulted.
    const live=scope.mode==='LIVE',readReady=()=>
      (generation===null||generation===this.executionGeneration)
      &&(!live||this.liveExecutionReady()===true);
    if(!readReady())return deny('r17_live_not_ready');
    if(watch.role==='REGULAR'){
      const clock=await this.regularClockPreflight(q);
      if(clock.decision.action!=='ALLOW'){
        this.noteDecision('clock_preclaim',clock.decision.reason,watch,q);
        if(clock.decision.reason==='minimum_game_time_wait'&&clock.decision.nextEligibleAtMs>0)
          this.requestQuotePageAfter(Math.max(250,clock.decision.nextEligibleAtMs-Date.now()));
        return deny('r17_'+clock.decision.reason);
      }
    }
    // This snapshot is a strategy observation, not an order book or entry
    // authority. The executable price and depth are obtained below.
    let claim;
    try{claim=await this.store.claim(watch,watch.revision,card);}catch(error){
      return deny('r17_watch_claim_failed:'+String(error?.message||error));}
    let created=0,firstRefusal=null;
    const refused=reason=>{
      firstRefusal??=reason;
      this.noteDecision('execution_preflight',reason,watch,q);
    };
    for(let seat=1;seat<=card.multiply;seat++){
      if(!validScope(scope,this.scope())||!readReady()){
        refused('r17_current_scope_or_actual_live_authority_changed');break;
      }
      const latest=this.engine.market.getQuote?.(claim.ticker);
      if(!latest||String(latest.eventTicker||latest.ticker)!==claim.eventTicker){refused('r17_current_market_identity_unavailable');break;}
      const liveQuote=stampLiveEpoch({...latest},String(this.engine.market.quoteEpoch||''));
      const evaluation=r17SignalUsingOriginalStarlight({watch:claim,quote:liveQuote,
        card,now:Date.now(),advance:false,liveEpoch:this.engine.market.quoteEpoch||''});
      if(!evaluation.ok||!evaluation.signal?.qualified){refused('r17_card_or_market_signal_no_longer_qualified');break;}
      const limit=Number(liveQuote.yesAsk);
      const requested=Math.max(1,Math.floor(card.stakeCents/Math.max(1,limit)));
      // MarketHub obtains an authenticated executable REST book separately from
      // the fast price signal. No cache-only depth is admissible.
      const plan=await this.engine.strategy.prepareEntryExecution(liveQuote,requested).catch(()=>null);
      if(!plan||Number(plan.count)<=0||Number(plan.count)>requested){refused('r17_authentic_executable_book_unavailable');break;}
      // Keep the strategy's exact observed quote timestamp and price. The
      // independent, fresher REST book may advance its timestamp, which is
      // NOT evidence of a changed qualified strategy signal. It must still
      // prove an ACTIVE market, sufficient depth and an ask no worse than the
      // qualified limit. Never silently raise that limit.
      if(!plan.freshMarket||String(plan.freshMarket.status||'').toLowerCase()!=='active'
        ||plan.freshMarket.result||plan.freshMarket.bookInvalid===true
        ||Number(plan.freshMarket.yesAsk)>limit+1e-9
        ||String(plan.freshMarket.ticker)!==claim.ticker){refused('r17_executable_book_market_or_price_invalid');break;}
      // Regular capital only. Aquarius/Pisces retain verified-loss doctrine.
      if(claim.role==='REGULAR'){
        const clock=await this.regularClockPreflight(liveQuote);
        if(clock.decision.action!=='ALLOW'){refused('r17_'+clock.decision.reason);break;}
      }
      const quote={...liveQuote,ticker:claim.ticker,eventTicker:claim.eventTicker};
      // A newer authenticated quote is not drift if it just requalified and
      // the executable book is still admissible. Bind the claim to that quote
      // and persist it so SQL admission sees the same observation.
      const obs=quote.quoteObservation||{};
      const advanced=quotedNow(quote)!==Number(claim.lastQuoteAtMs)
        ||Number(quote.yesBid)!==Number(claim.lastBidCents)
        ||Number(quote.yesAsk)!==Number(claim.lastAskCents);
      if(advanced){
        if(!(Number(obs.revision)>0)||!(Number(obs.receivedAtMs)>0)||!obs.epoch){
          refused('r17_observation_timestamp_drift');break;
        }
        claim={...claim,
          lastQuoteAtMs:quotedNow(quote),lastQuoteReceivedAtMs:Number(obs.receivedAtMs),
          lastQuoteRevision:Number(obs.revision),lastQuoteEpoch:String(obs.epoch),
          lastBidCents:Number(quote.yesBid),lastAskCents:Number(quote.yesAsk)};
        if(typeof this.store.refreshClaimedObservation==='function'){
          try{claim=await this.store.refreshClaimedObservation(claim,claim.revision);}
          catch(error){refused('r17_observation_timestamp_drift');break;}
        }
      }
      const eid=r17ScopedId('ENTRY',scope,claim.parentEntryId,claim.saint,seat);
      const clientOrderId=live?this.engine.kalshi.buildClientOrderId(scope.ownerId,eid,'entry'):null;
      const candidate=createGoldenSaintCapitalEntry({watch:claim,card,settings:this.settings(),
        quote,execution:plan,seat,clientOrderId});
      if(!candidate.ok){refused('r17_card_economics_'+candidate.reason);await this.audit('candidate_denied',{reason:candidate.reason,saint:claim.saint,seat});break;}
      const entry=candidate.entry;
      let exchangeIndex=null;
      if(live){
        if(typeof this.engine.kalshi.ensureExchangeBalance!=='function'){refused('r17_broker_funding_contract_unavailable');break;}
        const funding=await this.engine.kalshi.ensureExchangeBalance({ticker:entry.ticker,
          exchangeIndex:Number.isInteger(Number(quote.exchangeIndex))?Number(quote.exchangeIndex):null,
          requiredCents:candidate.requiredCents}).catch(()=>null);
        if(!funding?.ok||!Number.isInteger(Number(funding.exchangeIndex))){refused('r17_broker_shard_funding_not_verified');break;}
        exchangeIndex=Number(funding.exchangeIndex);
        entry.entryConfig.brokerRouting={exchangeIndex};
        if(!readReady()){refused('r17_live_admission_changed_after_funding');break;}
      }
      // Balance preflight is asynchronous. A window that closed during funding
      // cannot create a new seat; a no-seat claim remains safely retryable.
      if(claim.role==='REGULAR'){
        const clock=await this.regularClockPreflight(quote);
        if(clock.decision.action!=='ALLOW'){refused('r17_'+clock.decision.reason);break;}
      }
      let reserved;
      try{reserved=await this.store.reserveSeat({scope,watch:claim,expectedRevision:claim.revision,
        seat,entry,requiredCents:candidate.requiredCents,
        ...(claim.role==='REGULAR'?{confirmReservation:({settings})=>{
          const decision=this.regularClockDecision(quote,settings,Date.now());
          return decision.action==='ALLOW'?{ok:true}:deny('r17_'+decision.reason);
        }}:{})});}
      catch(error){
        await this.audit('seat_denied',{reason:String(error?.message||error),saint:claim.saint,seat});
        refused('r17_native_seat_reservation_denied');
        if(!created&&typeof this.store.releaseClaimNoSend==='function')
          await this.releaseUnseatedClaim(scope,claim);
        break;
      }
      if(!reserved?.ok){refused('r17_native_seat_reservation_not_committed');break;}
      created++;
      if(live){
        const outcome=await this.dispatchLive({entry,scope,plan,quote,exchangeIndex,generation});
        if(outcome.pending)this.stats.pending++;
        if(!outcome.ok)await this.audit('broker_pending_or_denied',{reason:outcome.reason,entryId:entry.id});
        // A broker response—even a non-fill—cannot grant a second send for the
        // SAME seat. Each remaining seat has its own immutable reserved ID.
      }else{
        this.stats.opened++;
        this.recordFunnel({candidateId:entry.id,parentEntryId:claim.parentEntryId,
          eventTicker:entry.eventTicker,ticker:entry.ticker,stage:'sim_order_opened',
          status:'progress',reason:'native_seat_committed'});
      }
    }
    if(created){await this.store.closeWatch(scope,claim.authorizationId).catch(()=>{});
      await this.audit('watch_consumed',{saint:claim.saint,watch:claim.authorizationId,created});
    }else if(typeof this.store.releaseClaimNoSend==='function'){
      await this.releaseUnseatedClaim(scope,claim);
    }
    return {ok:created>0,created,reason:created>0?null:firstRefusal||'r17_no_funded_seat_reserved'};
  }
  /** LIVE-only transport; no receipt is a fill. Durable intent created before
   * any POST, and NO restart path sends an existing entry again.
   */
  async dispatchLive({entry,scope,plan,quote,exchangeIndex,generation=null}){
    if(scope.mode!=='LIVE'||!Number.isSafeInteger(exchangeIndex)||exchangeIndex<0)
      return deny('r17_broker_route_invalid');
    const e=this.engine,originalSafety=Number(e.runtimeSettingsSafetyRevision||0);
    const current=()=>e.running===true&&!e.shuttingDown&&this.liveExecutionReady()===true
      &&(generation===null||generation===this.executionGeneration)
      &&validScope(scope,this.scope())&&Number(e.runtimeSettingsSafetyRevision||0)===originalSafety;
    const collateral=liveRecoveryCollateralRequirement(entry);
    if(!collateral.ok||!current())return deny('r17_live_preflight_expired');
    const role=String(entry.entryConfig?.goldenSaintR17?.role||'');
    if(!['REGULAR','RECOVERY_1','RECOVERY_2'].includes(role))return deny('r17_durable_entry_role_invalid');
    const isRegular=role==='REGULAR';
    const dispatchClockQuote=()=>{
      const currentQuote=e.market?.getQuote?.(entry.ticker);
      // No snapshot from another event may be substituted at the final gate.
      if(currentQuote&&String(currentQuote.eventTicker||currentQuote.ticker)!==entry.eventTicker)
        return {ticker:entry.ticker,eventTicker:entry.eventTicker,gameClockState:{phase:'CONFLICT'}};
      return {...quote,...currentQuote,
        gameClockState:currentQuote?.gameClockState||quote?.gameClockState,
        eventTicker:entry.eventTicker,ticker:entry.ticker};
    };
    let dispatchClaimed=false,latestProof=null,latestExecution=null;
    const beforeDispatch=async()=>{
      if(!current())return deny('r17_live_runtime_changed');
      const proof=await this.store.verifyLiveIntent(scope,entry.id).catch(()=>null);
      if(!proof?.ok)return deny(proof?.reason||'r17_live_intent_unavailable');
      const balance=await e.kalshi.preflightExchangeBalance({ticker:entry.ticker,exchangeIndex,
        requiredCents:collateral.requiredCents}).catch(()=>null);
      if(!balance?.ok||Number(balance.exchangeIndex)!==exchangeIndex)return deny('r17_live_cash_not_verified');
      if(isRegular){
        const checked=await this.regularClockPreflight(dispatchClockQuote());
        if(checked.decision.action!=='ALLOW')return deny('r17_'+checked.decision.reason);
      }
      const refreshed=await e.strategy.prepareEntryExecution({...quote,yesAsk:entry.entryPriceCents},entry.count).catch(()=>null);
      latestExecution=refreshed;
      latestProof=liveEntryDispatchBookConfirmation({execution:refreshed,market:e.market,
        ticker:entry.ticker,eventTicker:entry.eventTicker,count:entry.count,
        limitCents:entry.entryPriceCents,maximumBookAgeMs:Math.min(5000,Number(this.settings().infinityBreakMaximumBookAgeMs||5000))});
      if(!latestProof.ok)return latestProof;
      const again=await this.store.verifyLiveIntent(scope,entry.id).catch(()=>null);
      if(!again?.ok||!current())return deny('r17_live_intent_or_runtime_changed');
      // Durable seat was uniquely reserved BEFORE transport. Calling this
      // callback a second time never grants a different client order ID.
      dispatchClaimed=true;return {ok:true};
    };
    const confirmDispatch=()=>{
      if(!dispatchClaimed||!current()||!latestProof?.ok||!latestExecution)
        return deny('r17_final_dispatch_drift');
      // Final synchronous book/sequence check immediately before POST. If a
      // new quote invalidated the REST preflight, do not send or retry.
      if(isRegular){
        // Synchronous final no-send check. No network or fresh local timestamp
        // can be manufactured between broker validation and the actual POST.
        const clock=this.regularClockDecision(dispatchClockQuote(),this.settings(),Date.now());
        if(clock.action!=='ALLOW')return deny('r17_'+clock.reason);
      }
      return liveEntryDispatchBookConfirmation({execution:latestExecution,market:e.market,
        ticker:entry.ticker,eventTicker:entry.eventTicker,count:entry.count,
        limitCents:entry.entryPriceCents,
        maximumBookAgeMs:Math.min(5000,Number(this.settings().infinityBreakMaximumBookAgeMs||5000))});
    };
    let receipt;
    try{receipt=await e.kalshi.placeOrder({ticker:entry.ticker,action:'buy',count:entry.count,
      priceCents:entry.entryPriceCents,clientOrderId:entry.entryClientOrderId,
      exchangeIndex,timeInForce:'immediate_or_cancel'}, {beforeDispatch,confirmDispatch});}
    catch{
      this.recordFunnel({candidateId:entry.id,parentEntryId:entry.sourceTradeId,
        eventTicker:entry.eventTicker,ticker:entry.ticker,stage:'live_reconciliation_pending',
        status:'wait',reason:'r17_broker_transport_uncertain'});
      return {ok:false,pending:dispatchClaimed,reason:'r17_broker_transport_uncertain'};
    }
    if(receipt?.notSubmitted===true&&!receipt.orderId&&!(Number(receipt.fillCount)>0)&&receipt.ambiguous!==true){
      // Local Kalshi transport provides positive non-submission evidence.
      // Mark BOTH the entry and seat terminal in a single native transaction;
      // the original immutable client ID is still retained for an audit.
      try{
        const done=await this.store.finalizeProvenNoSend(scope,entry.id);
        if(done?.ok){
          this.recordFunnel({candidateId:entry.id,parentEntryId:entry.sourceTradeId,
            eventTicker:entry.eventTicker,ticker:entry.ticker,stage:'live_proven_no_send',
            status:'refused',reason:receipt.localRejectionReason||'native_no_send_finalized'});
          return {ok:false,pending:false,reason:'r17_proven_local_no_send'};
        }
      }catch(error){await this.audit('local_no_send_terminal_commit_failed',
          {entryId:entry.id,reason:String(error?.message||error)});}
      return {ok:false,pending:true,reason:'r17_local_no_send_terminal_commit_uncertain'};
    }
    // A positive HTTP response is not a fill. ProfitGuard performs the exact
    // authenticated broker-order readback, partial-fill and fee reconciliation.
    if(receipt?.orderId){
      this.recordFunnel({candidateId:entry.id,parentEntryId:entry.sourceTradeId,
        eventTicker:entry.eventTicker,ticker:entry.ticker,stage:'live_order_submitted',
        status:'progress',reason:'broker_order_receipt_fill_unconfirmed'});
      try{await e.db.updateEntry(entry.id,{entryOrderId:receipt.orderId,status:'entry_pending',
        updatedAtMs:Date.now()},null,entry);}catch{
        return {ok:false,pending:true,reason:'r17_receipt_persistence_uncertain'};
      }
    }
    this.recordFunnel({candidateId:entry.id,parentEntryId:entry.sourceTradeId,
      eventTicker:entry.eventTicker,ticker:entry.ticker,stage:'live_reconciliation_pending',
      status:'wait',reason:'broker_fill_readback_required'});
    return {ok:false,pending:true,reason:'r17_live_order_pending_reconciliation'};
  }
  snapshot(){return {version:R17_VERSION,stats:{...this.stats},activeTickers:this.activeTickers.size,
    mode:this.scope().mode,liveDispatchRequiresExistingOwnerAuthorization:true,
    additionalLiveReleaseGate:false,
    releaseGate:'NORMAL_OWNER_AND_BROKER_GATES_ONLY'};}
}
