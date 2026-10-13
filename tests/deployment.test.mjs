import test from 'node:test';import assert from 'node:assert/strict';import { readFile,readdir,stat } from 'node:fs/promises';import { resolve,dirname } from 'node:path';import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function files(dir){const out=[];for(const name of await readdir(dir)){if(name==='node_modules'||name==='.git'||name==='package-lock.json')continue;const p=resolve(dir,name),s=await stat(p);if(s.isDirectory())out.push(...await files(p));else out.push(p);}return out;}
test('deployment starts source directly and cannot repeat missing dist/index.js failure',async()=>{const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));assert.equal(pkg.scripts.start,'node src/index.mjs');assert.equal(pkg.scripts.start.includes('dist/'),false);const railway=JSON.parse(await readFile(resolve(root,'railway.json'),'utf8'));assert.equal(railway.deploy.startCommand,'npm start');assert.equal(railway.build.buildCommand,'npm test && npm run check');});
const R56_PROJECT_SOURCE_FILE_BUDGET=53; // R68 adds deterministic operator-plane regressions; generated dependency files remain excluded.
test("R56 project stays within the explicit compact authored source-file budget even when npm generates package-lock.json",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');assert.equal(RELEASE,'SAGITTARIUS-AU2-SA2-SHADOW-LOSS-REAL-CLONES-2026-10-13');const root=new URL('../',import.meta.url);async function walk(u){let out=[];for(const ent of await readdir(u,{withFileTypes:true})){if(ent.name==='node_modules'||ent.name==='.git'||ent.name==='package-lock.json')continue;const x=new URL(ent.name+(ent.isDirectory()?'/':''),u);if(ent.isDirectory())out.push(...await walk(x));else out.push(x);}return out;}const all=await walk(root);assert.equal(all.length,R56_PROJECT_SOURCE_FILE_BUDGET);assert.ok(all.some(x=>x.pathname.endsWith('/src/opportunity.mjs')));assert.ok(all.some(x=>x.pathname.endsWith('/src/authority.mjs')));assert.ok(all.some(x=>x.pathname.endsWith('/tests/r51.test.mjs')));});
test('all required Railway/Kalshi variables are recognized',async()=>{const src=await readFile(resolve(root,'src/config.mjs'),'utf8');for(const k of ['KALSHI_API_KEY_ID','KALSHI_PRIVATE_KEY_PEM','KALSHI_BASE_URL','DEFAULT_ENGINE_MODE','ALLOW_LIVE_TRADING','DATABASE_URL'])assert.ok(src.includes(k),`${k} missing`);});
test("R45 dashboard contains the four-layer Mega Wave architecture plus operational research sections",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(html.includes('ATOMIC THUNDER BOLT'));assert.ok(html.includes('ATHENA'));assert.ok(html.includes('INFINITY BREAK'));assert.ok(html.includes('AURORA EXECUTION'));assert.ok(html.includes('COSMO UNIVERSE'));assert.ok(app.includes('auroraDamageControlPercent'));assert.ok(app.includes('lightningPlasmaMaxStrikes'));for(const retired of ['momentumMinRiseCents','waveMinFeederFavorableMoveCents','crashRecoveryMinCrashCents','recoveryMinReboundCents'])assert.equal(app.includes(retired),false,retired);});

test("PDF-parity dashboard restores manual Hunter cashout and active Profit Guard visibility",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(html.includes('ATOMIC THUNDER BOLT'));assert.ok(html.includes('ATHENA'));assert.ok(html.includes('INFINITY BREAK'));assert.ok(html.includes('AURORA EXECUTION'));assert.ok(html.includes('COSMO UNIVERSE'));assert.ok(app.includes('auroraDamageControlPercent'));assert.ok(app.includes('lightningPlasmaMaxStrikes'));for(const retired of ['momentumMinRiseCents','waveMinFeederFavorableMoveCents','crashRecoveryMinCrashCents','recoveryMinReboundCents'])assert.equal(app.includes(retired),false,retired);});

test('crossed real-time books fail closed and trigger resync instead of feeding Hunters or Profit Guard',async()=>{const {MarketHub}=await import('../src/market.mjs');let resynced=false;const hub=new MarketHub({kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},wsUrl:'',fallbackWsUrl:'',getCredentials:()=>null});hub.quotes.set('T',{ticker:'T',yesBid:79,yesAsk:80,updatedAtMs:Date.now(),status:'active',result:'',bookInvalid:false});hub.books.set('T',{ticker:'T',yesBids:[{priceCents:80,count:1}],noBids:[{priceCents:25,count:1}],updatedAtMs:Date.now()});hub.resyncBook=async(ticker)=>{assert.equal(ticker,'T');resynced=true;};hub.applyBook('T');assert.equal(hub.getQuote('T').bookInvalid,true);await new Promise(r=>setImmediate(r));assert.equal(resynced,true);});

test('Railway health is liveness-only and remains 200 while engine is booting',async()=>{const { startServer }=await import('../src/server.mjs');const runtime={engine:null,boot:{status:'starting',startedAtMs:Date.now(),lastAttemptMs:Date.now(),attempts:1,lastError:null}};const server=startServer(runtime,0,root);await new Promise(r=>server.once('listening',r));const port=server.address().port;const health=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(health.status,200);const h=await health.json();assert.equal(h.processAlive,true);assert.equal(h.engineReady,false);const ready=await fetch(`http://127.0.0.1:${port}/ready`);assert.equal(ready.status,503);await new Promise(r=>server.close(r));});

test('HTTP listener is started before engine initialization and boot retries are retained',async()=>{const src=await readFile(resolve(root,'src/index.mjs'),'utf8');const listenAt=src.indexOf('startServer(runtime');const engineAt=src.indexOf('new SagittariusEngine()');assert.ok(listenAt>=0&&engineAt>=0&&listenAt<engineAt,'HTTP server must bind before engine init');assert.ok(src.includes('while (!stopping && !runtime.engine)'));assert.ok(src.includes('await sleep(5000)'));});


test('database learning schema is versioned and legacy-compatible',async()=>{const src=await readFile(resolve(root,'src/db.mjs'),'utf8');assert.ok(src.includes('sag_recovery_observations_v2'));assert.ok(src.includes('sag_sport_profiles_v2'));assert.ok(src.includes("tableColumns('sag_recovery_observations')"));assert.ok(src.includes("obs.has('trade_id') && obs.has('complete')"));assert.ok(src.includes("obs.has('id') && obs.has('tracking_complete')"));assert.ok(src.includes('await this.migrateLearningData()'));assert.ok(src.includes('sag_profit_episodes_v1'));assert.ok(src.includes('sag_profit_profiles_v1'));assert.ok(src.includes('upsertProfitEpisode'));assert.ok(src.includes('upsertProfitProfile'));assert.equal(src.includes('create index if not exists sag_recovery_obs_system on sag_recovery_observations('),false);});

test("R49 dashboard exposes Athena Exclamation plus the seven existing model toggles, Galactic Explosion and shared maximum in-game entry control",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(html.includes('ATOMIC THUNDER BOLT'));assert.ok(html.includes('ATHENA'));assert.ok(html.includes('INFINITY BREAK'));assert.ok(html.includes('AURORA EXECUTION'));assert.ok(html.includes('COSMO UNIVERSE'));assert.ok(app.includes('auroraDamageControlPercent'));assert.ok(app.includes('lightningPlasmaMaxStrikes'));for(const retired of ['momentumMinRiseCents','waveMinFeederFavorableMoveCents','crashRecoveryMinCrashCents','recoveryMinReboundCents'])assert.equal(app.includes(retired),false,retired);});

test("R45 preserves EMI1 and Atomic Thunder while adding Aurora and Galactic Explosion without restoring R42/R43 authorities",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');const pg=await readFile(new URL('../src/profitGuard.mjs',import.meta.url),'utf8');assert.equal(D.INFINITY_BREAK.authority,'PROFIT_EXIT');assert.equal(D.AURORA_EXECUTION.lossAuthority,'U-SG1');assert.equal(D.AURORA_EXECUTION.defaultDamageControlPercent,45);assert.ok(pg.includes("'infinity_break'"));assert.ok(pg.includes("'atomic_thunder_cashout'"),'legacy Atomic history must remain compatible');assert.ok(pg.includes('auroraDamageControlPercent'));assert.equal(pg.includes('maximumPositionLifetimeMs'),false);});


test('R36 deployment hardening pins ws above the 2026 security-advisory floor without changing pg',async()=>{
  const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  assert.equal(pkg.dependencies.ws,'8.21.3');
  const parts=String(pkg.dependencies.ws).split('.').map(Number);
  assert.ok(parts[0]===8 && (parts[1]>21 || (parts[1]===21 && parts[2]>=0)),'ws must remain at or above the 8.21.0 high-severity DoS fix floor');
  assert.equal(pkg.dependencies.pg,'8.16.3');
});

test('R37 preserves ATHENA-B1 as read-only exit context while diagnostics keep B1 exit authority false',async()=>{
  const src=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.match(src,/new ProfitGuard\(\{[\s\S]*?athena:\s*this\.athena[\s\S]*?\}\)/);
  assert.ok(/athenaExitAuthority:\s*false/.test(src));
  assert.ok(/athenaB1ExitAuthority:\s*false/.test(src));
  assert.ok(/athenaExitIntelligence:\s*ATHENA_EXIT_INTELLIGENCE\.version/.test(src));
  const pg=await readFile(resolve(root,'src/profitGuard.mjs'),'utf8');
  assert.ok(pg.includes('assessAthenaBrain(brain'));
  assert.equal(pg.includes('this.athena.assess('),false,'ProfitGuard may not call or mutate the B1 entry-assessment path');
});

test('R37 Golden Eye is intelligence-only and routes execution through the existing all-profitable manual cashout authority',async()=>{
  const ge=await readFile(resolve(root,'src/goldenEye.mjs'),'utf8');
  assert.equal(ge.includes("from './kalshi.mjs'"),false,'Golden Eye intelligence may not import broker transport');
  assert.equal(ge.includes('kalshi.placeOrder'),false,'Golden Eye intelligence may not place orders directly');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.ok(engine.includes("this.manualCashout({ allProfitable:true }, 'golden_eye_cashout')"),'Golden Eye execution must use the established global cashout path');
  const pg=await readFile(resolve(root,'src/profitGuard.mjs'),'utf8');
  assert.ok(pg.includes("reason === 'golden_eye_cashout'"));
  assert.ok(pg.includes('golden_eye_partial_depth_no_split'));
});

test('R38 manual Cash Out is wired as supervised Golden Eye training before and after execution, with historical backfill from closed manual trades',async()=>{
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const beginAt=engine.indexOf('beginManualTraining?.(open');
  const executeAt=engine.indexOf('const rows = await mapLimit(open');
  const completeAt=engine.indexOf('completeManualTraining?.(manualTrainingContext,result');
  assert.ok(beginAt>=0&&executeAt>beginAt&&completeAt>executeAt,'manual training must capture the pre-click state and then persist the realized label after execution');
  const ge=await readFile(resolve(root,'src/goldenEye.mjs'),'utf8');
  assert.ok(ge.includes('buildManualTrainingEpisodes'));
  assert.ok(ge.includes('manualEpisodes'));
  assert.ok(ge.includes('collectiveTrainingEpisodes'));
  const db=await readFile(resolve(root,'src/db.mjs'),'utf8');
  assert.ok(db.includes("close_reason='manual_cashout'"));
  assert.ok(db.includes('manualCashoutTrainingRows'));
});

test('R52 preserves Golden Eye isolation while adding only the explicit post-exit research state to sag_entries',async()=>{
  const db=await readFile(resolve(root,'src/db.mjs'),'utf8');
  assert.ok(db.includes('sag_golden_eye_state_v1'));
  assert.ok(db.includes('goldenEyeState(systemName)'));
  assert.ok(db.includes('saveGoldenEyeState(systemName,state)'));
  const sagEntriesSchema=(text)=>text.match(/create table if not exists sag_entries\s*\([\s\S]*?\);/)?.[0]||'';
  const schema=sagEntriesSchema(db);
  assert.ok(schema.length>0,'sag_entries schema must be present');
  assert.match(schema,/post_exit_state jsonb not null default/,'R52 must persist bounded post-exit regret/protection telemetry on the owned trade row');
  assert.equal(/golden[_ ]?eye/i.test(schema),false,'Golden Eye state must stay isolated from sag_entries');
});

test('R37 Golden Eye migration auto-enables only existing SIMULATION records while LIVE autonomy remains explicitly fail-safe off',async()=>{const C=await import('../src/config.mjs');const s=C.originalSettings();assert.equal(s.mode,'SIMULATION');assert.equal(s.liveArmed,false);assert.equal(C.normalizeStartupExecutionMode({...s,mode:'LIVE',liveArmed:true},true).settings.liveArmed,false);const old={...s};delete old.infinityBreakMinNetPerOriginalContractCents;old.atomicThunderMinNetPerOriginalContractCents=7;const migrated=C.sanitizeRuntimeSettings(old);assert.equal(migrated.infinityBreakMinNetPerOriginalContractCents,7);assert.equal(migrated.auroraDamageControlPercent,45);});

test('R37 Golden Eye quote events are not lost during an active evaluation/execution and shutdown clears/drains Golden Eye work',async()=>{
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.match(engine,/if \(this\.goldenEyeExecutionPromise\) \{\s*this\.goldenEyeRerunRequested = true;/);
  assert.match(engine,/if \(this\.goldenEyeEvaluationPromise\) \{\s*this\.goldenEyeRerunRequested = true;/);
  assert.ok(engine.includes('if (this.goldenEyeTimer) clearTimeout(this.goldenEyeTimer)'));
  assert.ok(engine.includes('Promise.allSettled(goldenEyePending)'));
  assert.ok(engine.includes('this.goldenEye?.persist?.(true)'));
});

test('R37 compact project includes exactly one dedicated Golden Eye runtime module and one dedicated Golden Eye unit suite',async()=>{
  const list=(await files(root)).map((p)=>p.slice(root.length+1));
  assert.ok(list.includes('src/goldenEye.mjs'));
  assert.ok(list.includes('tests/goldenEye.test.mjs'));
  assert.equal(list.filter((p)=>p.startsWith('src/')&&p.toLowerCase().includes('goldeneye')).length,1);
  assert.equal(list.filter((p)=>p.startsWith('tests/')&&p.toLowerCase().includes('goldeneye')).length,1);
});

test('R37 Railway validation is self-contained and does not depend on local sibling baseline directories',async()=>{
  const src=await readFile(resolve(root,'tests/deployment.test.mjs'),'utf8');
  const sibling=['..','sagittarius_r37_baseline'].join('/');
  const localWorkspace=['','mnt','data','sagittarius_r37_baseline'].join('/');
  assert.equal(src.includes(sibling),false,'Railway tests must not read a local sibling baseline directory');
  assert.equal(src.includes(localWorkspace),false,'Railway tests must not depend on the local validation workspace');
});


test('R39 SLW1 is structurally inside U-SG1 and cannot replace the frozen Danger Line or gain profit authority',async()=>{
  const doctrine=await readFile(resolve(root,'src/doctrine.mjs'),'utf8');
  const pg=await readFile(resolve(root,'src/profitGuard.mjs'),'utf8');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.ok(doctrine.includes("version: 'SLW1'"));
  assert.ok(doctrine.includes('wakeLossCents: 6000'));
  assert.ok(pg.includes('const watchdog = await this.handleStopLossWatchdog(entry, q, settings)'));
  assert.ok(pg.includes('if (bid0<=danger || stopGuardState(entry)) return { handled:false }'));
  assert.ok(pg.includes("return this.commitStopGuardExit(entry,freshQ,merged,reason)"),'SLW1 must delegate an exit to the existing U-SG1 commit path');
  assert.ok(engine.includes("stopLossWatchdogLossAuthority: ULTIMATE_STOP_GUARD.version"));
  assert.equal(pg.includes("closeReason:'slw1"),false,'SLW1 must not create a competing close-reason/execution lane');
});

test('R40 FSI1 reconstructs the green feeder number without pretending the trough was a tradable signal entry',async()=>{
  const {createFeederSignalIntelState,applyFeederSignalObservation,FEEDER_SIGNAL_INTELLIGENCE}=await import('../src/feederSignalIntel.mjs');
  const now=1_000_000;
  const entry={
    id:'dragon-1',systemName:'SAGITTARIUS',conceptName:'Dragon',ticker:'T',eventTicker:'E',marketTitle:'Example',mode:'SIMULATION',
    entryPriceCents:2,currentPriceCents:35,count:1500,volume24h:52000,spreadAtEntryCents:1,openedAtMs:now,
    entryConfig:{release:'R40',referenceStakeCents:3000,dragonSource:{version:'CI1',episodeId:'ep1',episodeIndex:1,preCrashPeakCents:45,troughCents:2,crashDepthCents:43,reboundCents:34,reclaimRate:34/43,stableObservations:3,upwardTicks:2,validatedBidCents:35,validatedAskCents:36,signalPriceCents:36,signalAtMs:now,troughAtMs:now-10_000}},
  };
  const state=createFeederSignalIntelState(entry,{yesBid:35,yesAsk:36,volume24h:52000,updatedAtMs:now},{systemName:'SAGITTARIUS',simFeeCents:2},now);
  assert.equal(state.economics.referenceOriginCents,2);
  assert.equal(state.economics.referenceCount,1500);
  assert.equal(state.economics.signalAskCents,36);
  assert.equal(state.economics.analysisCount,555);
  assert.equal(state.semantics.hindsightEntryAtTrough,false);
  const market={bookAgeMs:()=>10,executableBid:()=>({full:true,filled:555,avgCents:45,bestCents:45})};
  applyFeederSignalObservation(state,{yesBid:45,yesAsk:46,updatedAtMs:now+1000,status:'active'},market,now+1000);
  assert.equal(state.trajectory.currentReferencePnlCents,58500,'2c trough reference stake should explain the displayed +$585 reference PnL');
  assert.equal(state.trajectory.currentNormalizedMarkPnlCents,2775,'the causal $200 signal-time hypothetical is only +$27.75 at 45c bid');
  assert.equal(state.trajectory.currentNormalizedExecutablePnlCents,2775);
  assert.equal(FEEDER_SIGNAL_INTELLIGENCE.executionAuthority,false);
  assert.equal(FEEDER_SIGNAL_INTELLIGENCE.entryAuthority,false);
});

test('R40 FSI1 captures causal large-green threshold crossings and measures what happens after the crossing',async()=>{
  const {createFeederSignalIntelState,applyFeederSignalObservation}=await import('../src/feederSignalIntel.mjs');
  const t0=2_000_000;
  const entry={id:'dragon-2',systemName:'SAGITTARIUS',conceptName:'Dragon',ticker:'T2',eventTicker:'E2',marketTitle:'Threshold',mode:'SIMULATION',entryPriceCents:5,currentPriceCents:30,count:600,volume24h:1000,spreadAtEntryCents:1,openedAtMs:t0,entryConfig:{referenceStakeCents:3000,dragonSource:{episodeId:'ep2',troughCents:5,crashDepthCents:35,validatedBidCents:29,validatedAskCents:30,signalPriceCents:30,signalAtMs:t0}}};
  const state=createFeederSignalIntelState(entry,{yesBid:29,yesAsk:30,updatedAtMs:t0},{systemName:'SAGITTARIUS',simFeeCents:2},t0);
  const market={bookAgeMs:()=>5,executableBid:(ticker,count)=>({full:true,filled:count,avgCents:50,bestCents:50})};
  applyFeederSignalObservation(state,{yesBid:50,yesAsk:51,updatedAtMs:t0+1000,status:'active'},market,t0+1000);
  const m=state.trajectory.referenceProfitMilestones['20000'];
  assert.ok(m,'+$200 reference PnL threshold should be captured at first crossing');
  assert.equal(m.hypotheticalEntryAskCents,51,'threshold experiment must enter at the observable crossing ask, not at the trough or original Dragon signal');
  applyFeederSignalObservation(state,{yesBid:60,yesAsk:61,updatedAtMs:t0+61_000,status:'active'},market,t0+61_000);
  assert.ok(m.horizons['60000']);
  assert.ok(m.horizons['60000'].markNetPnlCents>0,'future result is measured from the threshold crossing forward');
  applyFeederSignalObservation(state,{yesBid:0,yesAsk:0,updatedAtMs:t0+120_000,status:'finalized',result:'no'},null,t0+120_000);
  assert.equal(state.trackingComplete,true);
  assert.equal(m.finalResult,'no');
  assert.ok(m.finalMarkNetPnlCents<0,'the telemetry must preserve the later collapse after a large green threshold');
});

test('R40 FSI1 is diagnostics-only, persisted separately, and cannot enter the trading authority path',async()=>{
  const fsi=await readFile(resolve(root,'src/feederSignalIntel.mjs'),'utf8');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const strategy=await readFile(resolve(root,'src/strategy.mjs'),'utf8');
  const db=await readFile(resolve(root,'src/db.mjs'),'utf8');
  assert.equal(fsi.includes("from './kalshi.mjs'"),false);
  assert.equal(fsi.includes('placeOrder'),false);
  assert.equal(fsi.includes('manualCashout'),false);
  assert.ok(db.includes('sag_feeder_signal_intel_v1'));
  assert.ok(engine.includes('async diagnostics()'));
  assert.ok(engine.includes('return {...boundedBase,feederSignalIntelligence,diagnosticExport:'));
  assert.ok(fsi.includes('rawObservationsIncluded:false'));
  assert.ok(fsi.includes('recordsCompact:true'));
  assert.ok(fsi.includes('recordLimit=400'));
  assert.ok(fsi.includes('huntersByTicker'));
  assert.ok(fsi.includes('compactFeederSignalIntelRecord'));
  assert.equal(engine.includes('feederSignalIntelligence: feederSignalIntelligence'),false,'full FSI records must not bloat the 2-second dashboard state/SSE path');
  assert.ok(strategy.includes('this.onFeederOpened?.(e)'));
  assert.ok(strategy.includes('Feeder creation must never depend on telemetry'));
  assert.ok(engine.includes('feederSignalIntelligenceExecutionAuthority: false'));
  assert.ok(engine.includes('feederSignalIntelligenceAthenaDecisionAuthority: false'));
});


test("R45 Aurora freezes the Danger Line while preserving R41 U-SG1 plus SLW1-R2 loss authority and SGRL1 evidence",async()=>{const {RELEASE,originalSettings,CANONICAL_NUMERIC_SETTINGS,CANONICAL_BOOLEAN_SETTINGS,sanitizeRuntimeSettings,normalizeStartupExecutionMode}=await import('../src/config.mjs');const D=await import('../src/doctrine.mjs');const {readFile,readdir,stat}=await import('node:fs/promises');const pg=await readFile(new URL('../src/profitGuard.mjs',import.meta.url),'utf8');assert.equal(D.INFINITY_BREAK.authority,'PROFIT_EXIT');assert.equal(D.AURORA_EXECUTION.lossAuthority,'U-SG1');assert.equal(D.AURORA_EXECUTION.defaultDamageControlPercent,45);assert.ok(pg.includes("'infinity_break'"));assert.ok(pg.includes("'atomic_thunder_cashout'"),'legacy Atomic history must remain compatible');assert.ok(pg.includes('auroraDamageControlPercent'));assert.equal(pg.includes('maximumPositionLifetimeMs'),false);});


test('R45-HF1 diagnostics serializer enforces a strict 2 MB UTF-8 body cap and prioritizes essential runtime/open-position evidence',async()=>{
  const {serializeDiagnosticDownload,DIAGNOSTIC_EXPORT_MAX_BYTES}=await import('../src/server.mjs');
  assert.equal(DIAGNOSTIC_EXPORT_MAX_BYTES,1_000_000);
  const giant='x'.repeat(10_000);
  const fakeRecords=Array.from({length:300},(_,i)=>({feederId:`f${i}`,ticker:`T${i}`,observations:[giant,giant,giant]}));
  const diagnostic={
    settings:{release:'R41-HF2',mode:'SIMULATION'},riskControls:{ultimateStopGuard:'U-SG1',stopLossWatchdog:'SLW1',stopGuardRecoveryLearning:'SGRL1'},
    health:{degraded:false,protectionOk:true},performance:{portfolioValueCents:1_000_000},conceptStats:[],entryPipeline:{version:'EPT1'},
    stopGuardRecoveryLearning:{version:'SGRL1'},openHunters:[{id:'KEEP',profitGuard:{stopGuardState:{phase:'RECOVERING'}}}],closedHunters:[],scanner:{tracked:1},
    feederSignalIntelligence:{version:'FSI1',summary:{signals:300},records:fakeRecords,recordsAvailable:300,recordsIncluded:300},
    snapshots:Array.from({length:100},()=>({blob:giant})),crashEpisodes:Array.from({length:100},()=>({blob:giant})),patterns:Array.from({length:100},()=>({blob:giant})),trackedMarkets:Array.from({length:100},()=>({blob:giant})),liveMarkets:[],openFeeders:[],audit:[],sports:[],crashLearning:{states:[]},
  };
  const out=serializeDiagnosticDownload(diagnostic);
  assert.ok(out.bytes<=DIAGNOSTIC_EXPORT_MAX_BYTES,`diagnostic body ${out.bytes} exceeds ${DIAGNOSTIC_EXPORT_MAX_BYTES}`);
  const parsed=JSON.parse(out.text);
  assert.equal(parsed.settings.release,'R41-HF2');
  assert.equal(parsed.riskControls.stopGuardRecoveryLearning,'SGRL1');
  assert.equal(parsed.openHunters[0].id,'KEEP');
  assert.equal(parsed.diagnosticExport.hardCapEnforced,true);
  assert.equal(parsed.diagnosticExport.version,'DX2');
});

test('R45-HF1 trading-log serializer enforces the same immutable 2 MB cap and preserves the newest/open-first prefix',async()=>{
  const {serializeTradingLogDownload,TRADING_LOG_EXPORT_MAX_BYTES}=await import('../src/server.mjs');
  assert.equal(TRADING_LOG_EXPORT_MAX_BYTES,1_000_000);
  const huge=['=== SAGITTARIUS TRADING LOGS ===','OPEN-KEEP '+('x'.repeat(500_000)),...Array.from({length:12},(_,i)=>`CLOSED-${i} ${'y'.repeat(300_000)}`)].join('\n');
  const out=serializeTradingLogDownload(huge,9_000_000);
  assert.ok(out.bytes<=1_000_000,`trading log body ${out.bytes} exceeds 1000000`);
  assert.equal(out.truncated,true);
  assert.ok(out.text.includes('OPEN-KEEP'));
  assert.ok(out.text.includes('TLX1 hard cap: 1000000 bytes'));
});

test('R45-HF1 compact trading log keeps analysis-critical trade economics while a 5000-row cohort remains downloadable under the hard barrier',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {serializeTradingLogDownload}=await import('../src/server.mjs');
  const engine=Object.create(SagittariusEngine.prototype);
  const now=Date.now();
  const rows=Array.from({length:5000},(_,i)=>({id:`H${i}`,ticker:`KXTESTGAME-${String(i).padStart(5,'0')}-YES`,conceptName:'Wave Surfer',sourceFeeder:'Pegasus',mode:'SIMULATION',status:i<20?'open':'closed',entryPriceCents:55,currentPriceCents:60,peakPriceCents:72,stopPriceCents:32,count:100,remainingCount:i<20?100:0,pnlCents:i<20?0:300,positionPnlCents:i<20?300:0,dataState:'LIVE',quoteAgeMs:500,lowestPriceAfterEntryCents:44,maeCents:11,maeAfterEntryMs:120000,recoveryToEntryMs:240000,recoveryToGreenMs:300000,closeReason:i<20?'':'atomic_thunder_cashout',openedAtMs:now-i*1000,closedAtMs:i<20?null:now-i*500}));
  engine.performance=async()=>({active:rows,hunters:rows,open:rows.slice(0,20),closed:rows.slice(20),wins:4980,losses:0,scratches:0,hunterRealizedCents:1_494_000,hunterUnrealizedCents:6_000});
  engine.decorateEntry=(e)=>e;
  const raw=await engine.tradingLogText();
  assert.ok(raw.startsWith('=== SAGITTARIUS TRADING LOGS ==='));
  assert.ok(raw.includes('Format: TLX1 compact analysis log'));
  assert.ok(raw.indexOf('KXTESTGAME-00000-YES')<raw.indexOf('KXTESTGAME-00020-YES'),'open positions must be emitted before closed history');
  const out=serializeTradingLogDownload(raw);
  assert.ok(out.bytes<=1_000_000);
  assert.ok(out.text.includes('entry=55c'));
  assert.ok(out.text.includes('mae=11c'));
});

test('R45-HF1 HTTP diagnostic and trading-log downloads advertise exact Content-Length and never exceed 2 MB',async()=>{
  const {startServer,DIAGNOSTIC_EXPORT_MAX_BYTES,TRADING_LOG_EXPORT_MAX_BYTES}=await import('../src/server.mjs');
  const giant='z'.repeat(3_000_000);
  const runtime={engine:{health:{degraded:false},async diagnostics(){return{settings:{mode:'SIMULATION'},riskControls:{auroraExecution:'AURORA-V1'},health:{degraded:false},performance:{},openHunters:[{id:'OPEN',blob:giant}],closedHunters:[],feederSignalIntelligence:{records:[]},snapshots:[{blob:giant}]};},async tradingLogText(){return`=== SAGITTARIUS TRADING LOGS ===\nOPEN\n${giant}`;}},boot:{status:'running',startedAtMs:Date.now(),attempts:1}};
  const server=startServer(runtime,0,root);await new Promise(r=>server.once('listening',r));const port=server.address().port;
  try{
    for(const path of ['/api/diagnostics/download','/api/trading-logs/download']){
      const res=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(res.status,200);const bytes=(await res.arrayBuffer()).byteLength;assert.equal(Number(res.headers.get('content-length')),bytes);assert.equal(res.headers.get('x-collection-complete'),'false');
    }
  }finally{await new Promise(r=>server.close(r));}
});

test('R41-HF2 compact FSI diagnostic projection removes raw observation arrays but preserves causal economics, milestones and linked Hunter outcomes',async()=>{
  const {compactFeederSignalIntelRecord}=await import('../src/feederSignalIntel.mjs');
  const r=compactFeederSignalIntelRecord({version:'FSI1',feederId:'F',feederConcept:'Dragon',ticker:'T',trajectoryCoverage:'causal_from_signal',economics:{signalAskCents:40,analysisCount:500},trajectory:{observationCount:1200,storedObservationCount:900,currentNormalizedExecutablePnlCents:5000,checkpoints:{'60000':{markNetPnlCents:500}},referenceProfitMilestones:{'20000':{crossedAtMs:100,hypotheticalEntryAskCents:51,hypotheticalCount:392,horizons:{'60000':{atMs:60100,bidCents:60,askCents:61,markNetPnlCents:2744,referencePnlCents:22000}},finalMarkNetPnlCents:-1000,finalResult:'no'}}},observations:Array.from({length:1200},()=>({large:'ignored'})),linkedHunters:[{id:'H',pnlCents:-1000}]});
  assert.equal('observations' in r,false);
  assert.equal(r.trajectory.observationCount,1200);
  assert.equal(r.trajectory.referenceProfitMilestones['20000'].horizons['60000'].markNetPnlCents,2744);
  assert.equal(r.linkedHunters[0].id,'H');
});

test('HF3 diagnostics and trading-log collection fail over to bounded runtime-only incident evidence when DB-backed collection stalls',async()=>{
  const {collectDiagnosticData,collectTradingLogText,serializeDiagnosticDownload,serializeTradingLogDownload}=await import('../src/server.mjs');
  const never=()=>new Promise(()=>{});
  const engine={
    settings:{systemName:'SAGITTARIUS',mode:'SIMULATION',pegasusEnabled:true,dragonEnabled:true,galacticExplosionEnabled:true,momentumHunterEnabled:true,waveSurferEnabled:true,recoveryHunterEnabled:true,crashRecoveryHunterEnabled:true},
    health:{degraded:true,lastError:'simulated_db_pressure'},lastError:'simulated_db_pressure',running:true,scanRequested:true,lastFullScanMs:123,
    protectedTickers:new Set(['A']),feederPriorityTickers:new Set(['A','B']),recoveryPriorityTickers:new Set(['C']),crashPriorityTickers:new Set(['D']),
    entryEvaluationQueue:{snapshot:()=>({maxConcurrency:2,active:2,pending:12,rerun:8,totalStarted:20,totalCoalesced:100,maxObservedActive:2})},
    quoteProtectionQueue:{snapshot:()=>({maxConcurrency:3,active:2,pending:1,rerun:0,totalStarted:10,totalCoalesced:3,maxObservedActive:3})},
    resourceUsageSnapshot:()=>({version:'RGM2',workload:{version:'DBPI2',quoteProtectionScope:'REAL_HUNTERS_ONLY',entryWorkers:2,protectionWorkers:3,ordinaryPoolReservedHeadroom:3,stateDbFanoutMaximum:2,referenceSignalSweepIntervalMs:30000},database:{mainPool:{max:8,total:8,idle:1,waiting:0},lockPool:{max:2,total:0,idle:0,waiting:0},maximumConnections:10}}),
    strategy:{entryPipelineSummary:()=>({version:'EPT1',attempts:99,opened:2,blocked:97})},
    diagnostics:never,tradingLogText:never,
  };
  const d=await collectDiagnosticData(engine,{timeoutMs:20});
  assert.equal(d.diagnosticExport.incidentFallback,true);
  assert.equal(d.diagnosticExport.collectionComplete,false);
  assert.equal(d.riskControls.incidentDiagnosticFallback,'RUNTIME_ONLY_NO_DB');
  assert.equal(d.riskControls.entryEvaluationBackpressure.active,2);
  assert.equal(d.resourceUsage.workload.version,'DBPI2');
  assert.equal(d.resourceUsage.workload.quoteProtectionScope,'REAL_HUNTERS_ONLY');
  assert.equal(d.incidentRuntime.feederPriorityTickerCount,2);
  assert.match(d.incidentRuntime.reason,/diagnostic_collection_timeout/);
  const ds=serializeDiagnosticDownload(d);assert.ok(ds.bytes<=1_000_000);

  const log=await collectTradingLogText(engine,{timeoutMs:20});
  assert.match(log,/TRADING LOG EXPORT FALLBACK/);assert.match(log,/collection_complete=false/);assert.match(log,/runtime_only_no_database_queries/);
  const ls=serializeTradingLogDownload(log);assert.ok(ls.bytes<=1_000_000);
});


test('R54 RGM3 pressure defers heavyweight historical exports without invoking DB-backed collectors',async()=>{
  const {collectDiagnosticData,collectTradingLogText}=await import('../src/server.mjs');
  let diagnosticsCalled=0,logsCalled=0;
  const engine={
    resourceResearchDeferred:true,resourcePressureState:'HARD_RESEARCH_SHED',
    settings:{systemName:'SAGITTARIUS',mode:'SIMULATION',pegasusEnabled:true,dragonEnabled:true,scarletNeedleEnabled:true},
    health:{degraded:false,lastError:null},lastError:null,running:true,scanRequested:false,lastFullScanMs:123,
    protectedTickers:new Set(['OPEN']),feederPriorityTickers:new Set(['COSMO']),recoveryPriorityTickers:new Set(),crashPriorityTickers:new Set(),
    entryEvaluationQueue:{snapshot:()=>({maxConcurrency:2,active:1,pending:0,rerun:0,totalStarted:1,totalCoalesced:0,maxObservedActive:1})},
    quoteProtectionQueue:{snapshot:()=>({maxConcurrency:3,active:1,pending:0,rerun:0,totalStarted:1,totalCoalesced:0,maxObservedActive:1})},
    resourceUsageSnapshot:()=>({version:'RGM5',pressureState:'HARD_RESEARCH_SHED',researchDeferred:true,workload:{version:'DBPI2'}}),
    strategy:{entryPipelineSummary:()=>({version:'EPT1',attempts:1,opened:1,blocked:0})},
    async diagnostics(){diagnosticsCalled+=1;throw new Error('must_not_run');},
    async tradingLogText(){logsCalled+=1;throw new Error('must_not_run');},
  };
  const d=await collectDiagnosticData(engine,{timeoutMs:100});
  assert.equal(diagnosticsCalled,0,'pressure fallback must not invoke historical diagnostics');
  assert.equal(d.diagnosticExport.incidentFallback,true);
  assert.match(d.incidentRuntime.reason,/diagnostic_deferred_resource_pressure/);
  assert.equal(d.resourceUsage.pressureState,'HARD_RESEARCH_SHED');
  const log=await collectTradingLogText(engine,{timeoutMs:100});
  assert.equal(logsCalled,0,'pressure fallback must not invoke full trading log collection');
  assert.match(log,/trading_log_deferred_resource_pressure/);
  assert.match(log,/RGM5 is protecting trading memory/);
});

test('R54 RGM3 live dashboard yields refresh cadence under memory pressure but never changes trading cadence',async()=>{
  const server=await readFile(resolve(root,'src/server.mjs'),'utf8');
  assert.match(server,/HARD_RESEARCH_SHED/);
  assert.match(server,/\?5000:pressure==='COMPACT'\?3000:2000/);
  assert.match(server,/const timer=setInterval\(push,1000\)/);
  assert.equal(server.includes('setInterval(push,5000)'),false,'five-second pressure cadence must be dashboard-only, not a replacement engine loop');
});

test('R54 closed-position dashboard projection never rehydrates full historical Athena FIRE graphs',async()=>{
  const {Database}=await import('../src/db.mjs');
  let sql='';
  const db=Object.create(Database.prototype);
  db.pool={query:async(q)=>{sql=String(q);return{rows:[]};}};
  const rows=await db.recentClosedHunters('S',{limit:150});
  assert.deepEqual(rows,[]);
  assert.match(sql,/jsonb_build_object\('aurora'/);
  assert.match(sql,/entry_config->'infinityBreak'/);
  assert.equal(/select\s+\*/i.test(sql),false,'closed dashboard query must not select full rows');
  assert.match(sql,/'\{\}'::jsonb as stop_guard_state/);
});

test('R61 startup has no Scarlet retracement-arm hydration path or incomplete-history dependency',async()=>{
  const {AthenaCommander}=await import('../src/athena.mjs');
  let incompleteReads=0;
  const db={
    async athenaEconomicEntries(){return[];},
    async athenaEconomicOpportunityEpisodes(){return[];},
    async athenaEconomicProfitEpisodes(){return[];},
    async opportunityEpisodes(_system,options={}){if(options.trackingComplete===false)incompleteReads+=1;return[];},
    async audit(){},
  };
  const athena=new AthenaCommander({db,systemName:'S',sourceRelease:'R61-TEST',getSettings:()=>({scarletNeedleEnabled:true})});
  await athena.init();
  assert.equal(incompleteReads,0,'Athena startup must never scan old incomplete Scarlet arm history');
  assert.equal(typeof athena.hydrateScarletNeedleArms,'undefined');
  assert.equal(typeof athena.armScarletNeedle,'undefined');
  assert.equal(typeof athena.evaluateScarletNeedle,'undefined');
  assert.equal(athena.summary().scarletNeedle.managedBy,'ENGINE_CRYSTAL_WALL_WIN_HANDOFF');
  const dbSource=await readFile(resolve(root,'src/db.mjs'),'utf8');
  const engineSource=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.equal(dbSource.includes('activeScarletNeedleArms'),false,'R61 must not restore an obsolete Scarlet arm query');
  assert.equal(engineSource.includes('hydrateScarletNeedleArms'),false,'R61 startup must contain no delayed-arm hydration');
  assert.equal(engineSource.includes('scarletNeedleArms'),false,'R61 engine must contain no retracement-arm runtime state');
});

test('R61 dashboard exposes Scarlet continuation controls and cache-busts the new frontend without old retracement doctrine',async()=>{
  const app=await readFile(resolve(root,'public/app.js'),'utf8');
  const html=await readFile(resolve(root,'public/index.html'),'utf8');
  const server=await readFile(resolve(root,'src/server.mjs'),'utf8');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const scarletAt=app.indexOf("{legacy:'Scarlet Needle',name:'Scarlet Needle'");
  const athenaAt=app.indexOf("{legacy:'Athena Exclamation',name:'Athena Exclamation'");
  const waveAt=app.indexOf("{legacy:'Wave Surfer',name:'Pegasus Ryu Sei Ken'");
  assert.ok(athenaAt>=0&&scarletAt>athenaAt&&waveAt>scarletAt,'Scarlet Needle must remain the second visible Execution Attack row');
  for(const key of ['scarletNeedleEnabled','scarletNeedleStakeCents','scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents','scarletNeedleInfinityNetPerOriginalContractCents','scarletNeedleMaxRepeats'])assert.ok(app.includes(key),key);
  assert.ok(app.includes('Athena-path Scarlet Attack'));
  assert.ok(app.includes('Max repeats'));
  assert.equal(app.includes('fixed 10c retracement'),false);
  assert.ok(engine.includes("this.settings.scarletNeedleEnabled === true ? 'Scarlet Needle'"),'Scarlet is a normal initial-exposure Attack');
  assert.ok(engine.includes('scarletNeedleContinuationAuthority:false'));
  assert.ok(engine.includes("noBoltNoAttackExceptions:['SAGITTARIUS_JUSTICE_ARROW_V2_CRASH_RECOVERY_AUTHORITY','CRYSTAL_WALL_V3_CRASH_RECOVERY_AUTHORITY']"));
  assert.ok(html.includes('/styles.css?v=R61MW1'));
  assert.ok(html.includes('/app.js?v=SJA2CW3'));
  assert.equal(server.includes('public, max-age=300'),false,'dashboard assets may not retain the old five-minute cache policy');
  assert.ok(server.includes("'cache-control':'no-store'"),'static dashboard responses must be no-store');

  const {startServer}=await import('../src/server.mjs');
  const runtime={engine:null,boot:{status:'starting',startedAtMs:Date.now(),attempts:1}};
  const srv=startServer(runtime,0,root);await new Promise(r=>srv.once('listening',r));const port=srv.address().port;
  try{
    for(const path of ['/','/app.js?v=SJA2CW3','/styles.css?v=R61MW1']){
      const res=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(res.status,200,path);assert.equal(res.headers.get('cache-control'),'no-store',path);
    }
    const js=await (await fetch(`http://127.0.0.1:${port}/app.js?v=SJA2CW3`)).text();assert.ok(js.includes("name:'Scarlet Needle'"));assert.ok(js.includes('scarletNeedleMaxRepeats'));
  }finally{await new Promise(r=>srv.close(r));}
});

test('R54 trade-priority DB readers keep admission, capital, recovery and startup history narrow',async()=>{
  const {Database}=await import('../src/db.mjs');
  const db=Object.create(Database.prototype);
  const seen=[];
  db.pool={query:async(q)=>{seen.push(String(q));return{rows:[{realized_cents:0,reserved_cents:0,active_entries:0,latest_hunter_entry_ms:0}]};}};
  await db.athenaR2FeederContextRows('S',{limit:32});
  await db.simulationCashAggregate('S',{simFeeCents:2});
  await db.hunterEventPolicySnapshot('S','EV');
  await db.recoverySourceEntries('S',{sinceMs:1});
  await db.feederEvaluationContext('S',{sinceMs:1});
  await db.sourceTradeIdsByConcept('S','Dragon');
  await db.recoveryObservationsByOriginalEntryIds('S',['E1']);
  await db.trackerHistoryRows('S',100);
  assert.equal(seen.length,8);
  for(const sql of seen)assert.equal(/select\s+\*/i.test(sql),false,`hot-path query must not SELECT *: ${sql.slice(0,80)}`);
  assert.match(seen[1],/sum\(pnl_cents\)/i,'simulation cash must be aggregated in PostgreSQL');
  assert.match(seen[2],/count\(\*\).*filter/i,'event policy must be aggregated in PostgreSQL');
  assert.match(seen[6],/original_entry_id = any/i,'recovery observations must be restricted to candidate source IDs');
  assert.match(seen[7],/select ticker,price_history,last_scan_ms/i,'startup tracker hydration must project only market history fields');
});

test('R54 StrategyEngine prefers compact trade-priority readers over the 5000-row historical ledger',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  let fullLedgerReads=0,compactContext=0,cashReads=0,recoveryReads=0,observationReads=0;
  const db={
    async entries(){fullLedgerReads+=1;throw new Error('full ledger forbidden');},
    async athenaR2FeederContextRows(){compactContext+=1;return[{id:'P1',conceptName:'Pegasus',ticker:'T',eventTicker:'E',entryPriceCents:55,openedAtMs:1,entryConfig:{}}];},
    async simulationCashAggregate(){cashReads+=1;return{realizedCents:125,reservedCents:25};},
    async recoverySourceEntries(){recoveryReads+=1;return[{id:'L1',conceptName:'Momentum Hunter',ticker:'T',eventTicker:'E',entryPriceCents:60,exitPriceCents:20,closedAtMs:Date.now(),entryConfig:{}}];},
    async recoveryObservationsByOriginalEntryIds(_system,ids){observationReads+=1;assert.deepEqual(ids,['L1']);return[{original_entry_id:'L1',trough_cents:10}];},
    async audit(){},
  };
  const settings={systemName:'S',startingCapitalCents:100000,simFeeCents:2,recoveryHunterEnabled:true,recoveryTrackingHours:24};
  const strategy=new StrategyEngine({db,kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},market:{},learning:{},getSettings:()=>settings,getLiveReady:()=>true});
  await strategy.hydrateAthenaR2FeederContext();
  assert.equal(strategy.athenaR2FeederHistory.length,1);
  assert.equal(await strategy.simulationAvailableCashCents(),100100);
  assert.deepEqual(await strategy.recoveryCandidateTickers(),['T']);
  const observations=await strategy.recoveryObservationsBySource(['L1']);
  assert.equal(observations.get('L1')?.trough_cents,10);
  assert.equal(compactContext,1);assert.equal(cashReads,1);assert.equal(recoveryReads,1);assert.equal(observationReads,1);
  assert.equal(fullLedgerReads,0,'production compact readers must prevent a 5000-row ledger hydration');
});

test('R54 Athena quote path and startup tracker hydration cannot restore heavyweight historical reads',async()=>{
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const start=engine.indexOf('async init()');
  const startupEnd=engine.indexOf('async start()',start);
  const startup=engine.slice(start,startupEnd>start?startupEnd:start+30000);
  assert.match(startup,/trackerHistoryRows\(this\.settings\.systemName,100\)/,'startup must hydrate only the bounded tracker-history projection');
  assert.equal(/trackers\(this\.settings\.systemName,\s*2000\)/.test(startup),false,'startup may not hydrate 2000 full tracker rows');
  const oppStart=engine.indexOf('async evaluateNewGenerationOpportunities');
  const oppEnd=engine.indexOf('\n  async ',oppStart+10);
  const opp=engine.slice(oppStart,oppEnd>oppStart?oppEnd:oppStart+30000);
  assert.match(opp,/openEntries\(s\.systemName\)/,'Athena quote evaluation must use active entries only');
  assert.match(opp,/recoverySourceEntries\(s\.systemName/,'Athena quote evaluation must use compact recovery candidates');
  assert.match(opp,/recoveryObservationsBySource\(recoveryLosses\.map/,'recovery observations must be requested only for candidate source IDs');
});

test('R55 Phoenix is event-driven, reference-only, TTL-bounded and cannot contaminate frozen Athena B2-R2 context',async()=>{
  const config=await readFile(resolve(root,'src/config.mjs'),'utf8');
  const doctrine=await readFile(resolve(root,'src/doctrine.mjs'),'utf8');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const strategy=await readFile(resolve(root,'src/strategy.mjs'),'utf8');
  const db=await readFile(resolve(root,'src/db.mjs'),'utf8');
  const phoenix=await readFile(resolve(root,'src/phoenix.mjs'),'utf8');
  const app=await readFile(resolve(root,'public/app.js'),'utf8');
  const html=await readFile(resolve(root,'public/index.html'),'utf8');

  assert.ok(config.includes("SAGITTARIUS-AU2-SA2-SHADOW-LOSS-REAL-CLONES-2026-10-13"));
  assert.ok(config.includes('phoenixEnabled: false'),'Phoenix must migrate fail-safe OFF');
  assert.ok(config.includes("'phoenixEnabled'"));
  for(const key of ['phoenixReferenceStakeCents','phoenixMinPriceCents','phoenixMaxPriceCents'])assert.ok(config.includes(key),key);

  assert.ok(doctrine.includes("version:'PHOENIX-COSMO-V1'"));
  assert.ok(doctrine.includes("policyRevision:'PC1-R1-CONFIRMED-LOW-BAND-ASCENT'"));
  assert.ok(doctrine.includes('minimumRiseCents:4'));
  assert.ok(doctrine.includes('minimumUpTicks:3'));
  assert.ok(doctrine.includes('requiredFreshConfirmations:2'));
  assert.ok(doctrine.includes('signalTtlMs:60_000'));
  assert.ok(doctrine.includes('entryAuthority:false'));
  assert.ok(doctrine.includes('orderAuthority:false'));
  assert.ok(doctrine.includes("activeCosmos:Object.freeze(['Pegasus','Dragon','Phoenix'])"));

  assert.ok(engine.includes("import { PhoenixCosmoEngine } from './phoenix.mjs'"));
  assert.ok(engine.includes('this.phoenixCosmo?.observe?.(q,Date.now())'));
  assert.ok(engine.includes('this.queuePhoenixSignal(phoenix,q)'));
  const fullScanStart=engine.indexOf('async fullScan('),fullScanEnd=engine.indexOf('\n  async ',fullScanStart+20);
  const fullScan=engine.slice(fullScanStart,fullScanEnd>fullScanStart?fullScanEnd:engine.length);
  assert.equal(fullScan.includes('phoenixCosmo?.observe'),false,'Phoenix must not add a second broad scanner');
  assert.ok(engine.includes('HARD_RESEARCH_SHED:128'),'RGM3 must be able to compact transient Phoenix watches first');

  assert.ok(strategy.includes("!['Pegasus','Dragon'].includes(String(entry.conceptName||''))"),'frozen B2 context must explicitly exclude Phoenix');
  assert.ok(strategy.includes("acquireCosmoSignalLock(s.systemName,'Phoenix',ticker)"),'Phoenix materialization needs cross-process serialization');
  assert.ok(strategy.includes('phoenixSignalActive(e,s,at)'),'duplicate check must respect TTL');
  assert.ok(strategy.includes("createGhost('Phoenix'"),'Phoenix must materialize only as a ghost/reference Cosmo');
  assert.ok(db.includes("concept_name in ('Pegasus','Dragon')"),'frozen B2 SQL reader must exclude Phoenix');
  assert.ok(db.includes("concept_name='Phoenix' and status='open'"),'Phoenix TTL expiry must be durable in PostgreSQL');
  assert.ok(db.includes('cosmo-signal'),'Phoenix needs a dedicated advisory-lock namespace');

  assert.ok(phoenix.includes('minimumRecentTrades'));
  assert.ok(phoenix.includes("reason:'new_local_low'"));
  assert.ok(phoenix.includes('sourceDoesNotAuthorizeEntry:true'));
  assert.ok(app.includes("legacy:'Phoenix',name:'Phoenix'"));
  assert.ok(html.includes('Pegasus, Dragon and Phoenix'));
  assert.ok(html.includes('/styles.css?v=R61MW1'));
  assert.ok(html.includes('/app.js?v=SJA2CW3'));
});

test('R60 Athena receives COSMO_GREEN directly; Arayashiki and ATB2 remain non-authority research only',async()=>{
  const doctrine=await readFile(resolve(root,'src/doctrine.mjs'),'utf8');
  const athena=await readFile(resolve(root,'src/athena.mjs'),'utf8');
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const strategy=await readFile(resolve(root,'src/strategy.mjs'),'utf8');
  const opportunity=await readFile(resolve(root,'src/opportunity.mjs'),'utf8');
  const html=await readFile(resolve(root,'public/index.html'),'utf8');
  const app=await readFile(resolve(root,'public/app.js'),'utf8');
  assert.ok(doctrine.includes("version:'COSMO-SHADOW-V1'"));
  assert.ok(doctrine.includes("policyRevision:'ATB3-R1-COSMO-GREEN-IMMEDIATE-BOLT'"));
  assert.ok(doctrine.includes("authority:'RESEARCH_ONLY'"));
  assert.equal(athena.includes('examineArayashikiSurvival({bolt,context,selectedAttack:null,now})'),false);
  assert.ok(athena.includes("reason='cosmo_green_best_attack'"));
  assert.ok(athena.includes("authorityMode:'COSMO_GREEN_DIRECT'"));
  assert.equal(strategy.includes('verifyArayashikiCertificate(command.survivalCertificate,now)'),false);
  assert.equal(strategy.includes('examineArayashikiSurvival'),false);
  assert.ok(opportunity.includes("event:COSMO_SHADOW_TRADING.atomicThunderEvent"));
  assert.ok(opportunity.includes("stage:'COSMO_GREEN'"));
  assert.ok(engine.includes("authorityChain:'GAME_CLOCK->COSMO_SHADOW->COSMO_GREEN->ATOMIC_THUNDER_BOLT->ATHENA->EXECUTION_ATTACK->INFINITY_BREAK/AURORA'"));
  assert.ok(html.includes('COSMO SHADOW TRADES'));
  assert.ok(html.includes('Cosmo GREEN trigger'));
  assert.ok(app.includes('atomicThunderGreenTriggerCents'));
  assert.equal(html.includes('PRE-BOLT → ATB2 → ARAYASHIKI'),false);
});

test('R60-HF1 reset permanently preserves intelligence and enforces an epoch/drain mutation barrier',async()=>{
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const strategy=await readFile(resolve(root,'src/strategy.mjs'),'utf8');
  const start=engine.indexOf('async resetSimulation()');
  const end=engine.indexOf('\n  async _reconcileBroker()',start);
  assert.ok(start>=0&&end>start,'resetSimulation source must be present');
  const reset=engine.slice(start,end);
  assert.equal(reset.includes('clearTrackers'),false,'Simulation reset must never delete persisted tracker intelligence');
  assert.equal(reset.includes('histories.clear'),false,'Simulation reset must never delete MarketHub rolling history');
  assert.ok(reset.includes('simulationMutationGate.blockAndDrain()'),'reset must close the mutation barrier before archive');
  assert.ok(reset.includes('simulationMutationGate.release()'),'reset must reopen the mutation barrier in finally');
  assert.ok(reset.includes('archiveSimulation'),'reset remains an economic-cohort archive, not an intelligence wipe');
  assert.ok(engine.includes('export class SimulationMutationGate'));
  assert.ok(strategy.includes("simulation_reset_mutation_blocked"),'final SIM persistence must reject stale pre-reset work');
});

test('R60-HF1 historical Athena and Atomic Thunder hydration is ranking/research-only and cannot block engine readiness',async()=>{
  const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const athena=await readFile(resolve(root,'src/athena.mjs'),'utf8');
  assert.equal(engine.includes('await this.legacyAthena.init()'),false,'legacy Athena research cannot block startup');
  assert.equal(engine.includes('await this.athenaCommander.init()'),false,'Athena historical ranking memory cannot block startup');
  assert.equal(engine.includes('await this.atomicThunderBolt.init()'),false,'Atomic Thunder counterfactual research cannot block startup');
  assert.ok(engine.includes('await this.strategy.init({backgroundResearch:true})'),'legacy strategy research must be detached');
  assert.ok(engine.includes('startBackgroundIntelligenceHydration()'),'background hydration launcher must exist');
  const protectionAt=engine.indexOf('this.protectionLoopPromise = this.protectionLoop()');
  const cycleAt=engine.indexOf('this.cyclePromise = this.cycleLoop()');
  const hydrateAt=engine.indexOf('this.startBackgroundIntelligenceHydration()',cycleAt);
  assert.ok(protectionAt>=0&&cycleAt>protectionAt&&hydrateAt>cycleAt,'trading/protection loops must start before optional historical hydration');
  assert.ok(engine.includes('tradingBlocked:false'),'hydration telemetry must explicitly expose non-blocking authority');
  assert.ok(athena.includes('entryAuthorityBlockedUntilLoaded:false'),'Athena summary must permanently document non-blocking history semantics');
  assert.ok(athena.includes("state:'STALE_DISCARDED'"),'late historical reads must not overwrite newer live learning');
  assert.ok(engine.includes("resetSafetyVersion:'R60-HF1-SIMULATION-MUTATION-EPOCH-DRAIN'"),'diagnostics must expose the reset barrier version');
  assert.ok(engine.includes('simulationMutationGate:this.simulationMutationGate?.snapshot?.()||null'),'diagnostics must expose reset gate state');
  assert.ok(engine.includes('intelligenceHydration:{...(this.intelligenceHydration||{}),tradingBlocked:false}'),'diagnostics must expose non-blocking hydration state');
  assert.ok(engine.includes('historicalIntelligenceBlocksTrading:false'),'diagnostics must make the authority boundary explicit');
});

test('R61-HF1 full scanner completes without any retired Scarlet priority-arm variable and advances scanner freshness',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {freshInstallSettings}=await import('../src/config.mjs');
  const source=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.equal(source.includes('scarletPriorityTickers'),false,'retired delayed-Scarlet priority variable must not survive R61-HF1');
  const e=Object.create(SagittariusEngine.prototype);
  e.settings={...freshInstallSettings(),systemName:'S',ownerId:'O',mode:'SIMULATION',engineActive:true};
  e.health={scannerFresh:false,degraded:true,lastError:null};e.speed={};e.cycleFailureCount=0;e.lastFullScanMs=0;e.lastDiscoveryMs=0;e.lastScanMarkets=[];
  e.recoveryPriorityTickers=new Set();e.crashPriorityTickers=new Set();
  e.db={
    async openEntries(){return[];},async openHunterEntries(){return[];},async trackers(){return[];},async audit(){},
  };
  e.market={quotes:new Map(),async discover(){return[];},sample(){},getQuote(){return null;}};
  e.learning={async trackRecovery(){},async trackStopGuardRecovery(){},async observeCrashQuote(){},async learnMarketDrops(){},async aggregatePatterns(){},async aggregateStopGuardProfiles(){},async learnDurations(){}};
  e.refreshRecoveryPriorityTickers=async()=>e.recoveryPriorityTickers;e.refreshCrashPriorityTickers=()=>e.crashPriorityTickers;
  let trackerPriority=null;e.persistTrackers=async(_markets,priority)=>{trackerPriority=[...priority];return new Map();};
  e.runProtectionSweep=async()=>{};e.evaluateEntryChain=async()=>[];e.runPostExitResearchIfDue=async()=>{};e.reconcileBroker=async()=>{};e.testConnection=async()=>{};e.snapshot=async()=>{};
  e.recomputeHealth=()=>{e.health.scannerFresh=e.lastFullScanMs>0;e.health.degraded=!e.health.scannerFresh;};
  const result=await e.fullScan();
  assert.deepEqual(result,{markets:0,newEntries:0});
  assert.deepEqual(trackerPriority,[]);
  assert.ok(e.lastFullScanMs>0);
  assert.equal(e.health.scannerFresh,true);
  assert.equal(e.health.degraded,false);
});

test('PNL1 restores Madrid day/week/month/year realized P&L metrics from durable closed Execution Attacks',async()=>{
  const {Database}=await import('../src/db.mjs');
  let capturedSql='';let capturedParams=null;
  const fake={pool:{query:async(sql,params)=>{capturedSql=sql;capturedParams=params;return{rows:[{closed_hunters:4,open_hunters:1,wins:3,losses:1,scratches:0,closed_realized_cents:1250,day_realized_cents:125,week_realized_cents:350,month_realized_cents:800,year_realized_cents:1250,partial_realized_cents:0,simulation_ledger_pnl_cents:0}]};}}};
  const out=await Database.prototype.performanceAggregate.call(fake,'SAGITTARIUS',{resetTimestampMs:123});
  assert.equal(out.day_realized_cents,125);
  assert.equal(out.week_realized_cents,350);
  assert.equal(out.month_realized_cents,800);
  assert.equal(out.year_realized_cents,1250);
  assert.equal(capturedParams[0],'SAGITTARIUS');
  assert.equal(capturedParams[2],123);
  assert.ok(capturedSql.includes("date_trunc('day',now() at time zone 'Europe/Madrid')"));
  assert.ok(capturedSql.includes("date_trunc('week',now() at time zone 'Europe/Madrid')"));
  assert.ok(capturedSql.includes("greatest($3::bigint,bounds.day_ms)"),'dashboard reset must remain authoritative over period history');
  assert.ok(capturedSql.includes("concept_name = any($2::text[]) and status='closed'"),'period P/L must remain scoped to closed Execution Attacks');

  const engineSrc=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const html=await readFile(resolve(root,'public/index.html'),'utf8');
  const app=await readFile(resolve(root,'public/app.js'),'utf8');
  for(const field of ['dayRealizedCents','weekRealizedCents','monthRealizedCents','yearRealizedCents'])assert.ok(engineSrc.includes(field),`${field} missing from state/performance path`);
  for(const [id,label] of [['profitToday','Profit Today'],['profitWeek','Profit This Week'],['profitMonth','Profit This Month'],['profitYear','Profit This Year']]){assert.ok(html.includes(`id="${id}"`),`${id} dashboard metric missing`);assert.ok(html.includes(label),`${label} label missing`);assert.ok(app.includes(`setPnl('${id}'`),`${id} renderer missing`);}
});

test('PNL1 engine operational performance carries database period aggregates unchanged into dashboard-ready camelCase fields',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={systemName:'SAGITTARIUS',resetTimestampMs:0,startingCapitalCents:1_000_000,simFeeCents:2};
  engine.db={
    performanceAggregate:async()=>({closed_realized_cents:1250,partial_realized_cents:0,day_realized_cents:125,week_realized_cents:350,month_realized_cents:800,year_realized_cents:1250,simulation_ledger_pnl_cents:0,wins:3,losses:1,scratches:0,closed_hunters:4,open_hunters:0}),
    openEntries:async()=>[],recentClosedHunters:async()=>[],conceptStatsAggregate:async()=>({portfolio:[],signals:[],linked:[]}),
  };
  const p=await engine.performance();
  assert.equal(p.dayRealizedCents,125);
  assert.equal(p.weekRealizedCents,350);
  assert.equal(p.monthRealizedCents,800);
  assert.equal(p.yearRealizedCents,1250);
  assert.equal(p.hunterRealizedCents,1250);
  assert.equal(p.portfolioValueCents,1_001_250);
});

test("LIVE-ARM-HOLD settings sanitize still fail-closes a missing arm", async () => {
  const { sanitizeRuntimeSettings } = await import('../src/config.mjs');
  const out = sanitizeRuntimeSettings({ mode: "LIVE", liveArmed: true, momentumStakeCents: 100 });
  assert.equal(out.liveArmed, false);
  assert.equal(out.mode, "LIVE");
});

test("LIVE-ARM-HOLD a number save cannot disarm an armed LIVE session", async () => {
  const { preserveExecutionArm, sanitizeRuntimeSettings } = await import('../src/config.mjs');
  const prior = { mode: "LIVE", liveArmed: true };
  const sanitized = sanitizeRuntimeSettings({ ...prior, atomicThunderGreenTriggerCents: 1 });
  const held = preserveExecutionArm(prior, sanitized);
  assert.equal(sanitized.liveArmed, false);
  assert.equal(held.mode, "LIVE");
  assert.equal(held.liveArmed, true);
  assert.equal(held.atomicThunderGreenTriggerCents, 1);
});

test("LIVE-ARM-HOLD a disarmed LIVE session stays disarmed across a number save", async () => {
  const { preserveExecutionArm, sanitizeRuntimeSettings } = await import('../src/config.mjs');
  const held = preserveExecutionArm({ mode: "LIVE", liveArmed: false }, sanitizeRuntimeSettings({ mode: "LIVE", momentumStakeCents: 100 }));
  assert.equal(held.mode, "LIVE");
  assert.equal(held.liveArmed, false);
});

test("LIVE-KALSHI-PORTFOLIO uses Kalshi cash plus position mark and surfaces untracked broker contracts", async () => {
  const { kalshiAccountSnapshot, brokerLedgerGaps } = await import("../src/config.mjs");
  const account = kalshiAccountSnapshot({ balance: 9491, portfolio_value: 594, balance_dollars: "94.9138" });
  assert.equal(account.cashCents, 9491);
  assert.equal(account.positionCents, 594);
  assert.equal(account.portfolioCents, 10085);
  assert.equal(kalshiAccountSnapshot(null), null);
  const gaps = brokerLedgerGaps(
    [{ ticker: "KXSVK2LGAME-26OCT04PETMAL-TIE", position_fp: "6.00" }, { ticker: "KXOTHER-YES", position_fp: "2.00" }],
    [{ ticker: "KXSVK2LGAME-26OCT04PETMAL-TIE", status: "open", remainingCount: 6 }]
  );
  assert.equal(gaps.brokerContracts, 8);
  assert.equal(gaps.ledgerContracts, 6);
  assert.deepEqual(gaps.untracked, [{ ticker: "KXOTHER-YES", broker: 2, ledger: 0, untracked: 2 }]);
});

test("SHARED-ACCOUNT two systems ignore each other and quarantine only their own hole", async () => {
  const { sharedAccountBook } = await import("../src/config.mjs");
  const kalshi = [
    { ticker: "KXSVK2LGAME-26OCT04PETMAL-TIE", position_fp: "6.00" },
    { ticker: "KXVALORANTGAME-26OCT040800T1FUT-T1", position_fp: "2.00" },
    { ticker: "KXITFWMATCH-26OCT04SIMSIM2-SIM", position_fp: "2.00" },
    { ticker: "KXJ2LEAGUEGAME-26OCT04TEGARD-TIE", position_fp: "3.00" },
  ];
  const boxA = sharedAccountBook({ systemId: "box-a", positions: kalshi, owned: [
    { ticker: "KXSVK2LGAME-26OCT04PETMAL-TIE", status: "open", remainingCount: 6, entryClientOrderId: "sag-box-a-petmal" },
  ]});
  const boxB = sharedAccountBook({ systemId: "box-b", positions: kalshi, owned: [
    { ticker: "KXVALORANTGAME-26OCT040800T1FUT-T1", status: "open", remainingCount: 2, entryClientOrderId: "sag-box-b-t1" },
    { ticker: "KXITFWMATCH-26OCT04SIMSIM2-SIM", status: "open", remainingCount: 2, entryClientOrderId: "sag-box-b-sim" },
    { ticker: "KXJ2LEAGUEGAME-26OCT04TEGARD-TIE", status: "open", remainingCount: 3, entryClientOrderId: "sag-box-b-j2" },
    { ticker: "KXLALIGA2GAME-26OCT04RSOGCF-RSO", status: "open", remainingCount: 1, entryClientOrderId: "sag-box-b-rso" },
  ]});
  assert.equal(boxA.continueTrading, true);
  assert.equal(boxA.quarantineOwn.length, 0);
  assert.equal(boxA.ignoredOtherSystem.length, 3);
  assert.equal(boxA.ownTradable[0].ticker, "KXSVK2LGAME-26OCT04PETMAL-TIE");
  assert.equal(boxB.continueTrading, true);
  assert.equal(boxB.ignoredOtherSystem.length, 1);
  assert.equal(boxB.ignoredOtherSystem[0].ticker, "KXSVK2LGAME-26OCT04PETMAL-TIE");
  assert.equal(boxB.quarantineOwn.length, 1);
  assert.equal(boxB.quarantineOwn[0].ticker, "KXLALIGA2GAME-26OCT04RSOGCF-RSO");
  assert.equal(boxB.ownTradable.length, 3);
  const after = sharedAccountBook({ systemId: "box-b", positions: kalshi, owned: boxB.ownTradable.map((x) => ({ ticker: x.ticker, status: "open", remainingCount: x.own })) });
  assert.equal(after.quarantineOwn.length, 0);
  assert.equal(after.ownTradable.length, 3);
  assert.equal(after.continueTrading, true);
});

test('RESET-ATTACK-COLUMN concept stats and headline honor reset stamp and current mode', async () => {
  const {Database}=await import('../src/db.mjs');
  let sql='', params=null;
  const fake={pool:{query:async(q,p)=>{sql=q;params=p;return{rows:[{portfolio:[],signals:[],linked:[]}]};}}};
  await Database.prototype.conceptStatsAggregate.call(fake,'SAGITTARIUS',{resetTimestampMs:1791186767130,mode:'SIMULATION'});
  assert.equal(params[3],1791186767130);
  assert.equal(params[4],'SIMULATION');
  assert.ok(sql.includes("closed_at_ms >= $4"));
  assert.ok(sql.includes("mode=$5"));
  const src=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.ok(src.includes('conceptStatsAggregate(this.settings.systemName,{resetTimestampMs:reset,mode:this.settings.mode})'));
  assert.ok(src.includes("mode: 'LIVE', liveArmed: true"));
});

test('LX1 ledger export splits above 60 rows under 1_000_000 bytes without dropping clones or inventing settings',async()=>{
  const {buildLedgerExportPackage,EXPORT_PART_MAX_BYTES}=await import('../src/server.mjs');
  assert.equal(EXPORT_PART_MAX_BYTES,999_999);
  const records=[];
  for(let i=0;i<80;i+=1){
    records.push({id:`P${i}`,systemName:'SAGITTARIUS',ticker:(i===0?'KXTEST-é-🎯':'KXTEST-'+i)+('X'.repeat(20000)),eventTicker:'KXTEST',conceptName:'Scarlet Needle',mode:'SIMULATION',status:'closed',openedAtMs:1000+i,closedAtMs:2000+i,entryPriceCents:80,exitPriceCents:90,count:1,remainingCount:0,pnlCents:i%5===0?-10:7,entryFeeCents:2,exitFeeCents:2,closeReason:'infinity_break',note:'N'.repeat(20000),entryConfig:i%2?{cloneGroupId:'EP1',crashEpisodeId:'CRASH-1',stakeCents:500,multiply:20,operatorMinEntryCents:80,operatorMaxEntryCents:90,profitAuthority:'ATHENA-X1',minProfitNetPerOriginalContractCents:13}:{cloneGroupId:'EP1'}});
  }
  const built=buildLedgerExportPackage({records,meta:{exportId:'exp-test',systemName:'SAGITTARIUS',resetTimestampMs:500,snapshotCutoffMs:9000,mode:'SIMULATION',expectedCount:80}});
  assert.equal(built.manifest.expectedTotals.positions,80);
  assert.equal(built.manifest.expectedTotals.cloneGroups,1);
  assert.equal(built.manifest.expectedTotals.closed,80);
  assert.ok(built.zip.length<=1_000_000,`package ${built.zip.length}`);
  for(const f of built.files){assert.ok(f.bytes<1_000_000,f.name+' '+f.bytes);const body=JSON.parse(f.name.endsWith('.json')?f.text:'{}');if(f.name.endsWith('.json')){assert.equal(body.systemName,'SAGITTARIUS');assert.ok(body.exportedAtMs);assert.ok('periodFromMs' in body);assert.ok(body.part);}}
  const trades=built.files.filter((f)=>f.name.startsWith('trades-')).flatMap((f)=>JSON.parse(f.text).records);
  assert.ok(trades.length>0&&trades.length<=80);
  assert.equal(new Set(trades.map((r)=>r.positionId)).size,trades.length);
  assert.equal(trades[0].gaps.includes('frozen_profitAuthority_not_recorded')||trades[1].gaps.includes('frozen_profitAuthority_not_recorded'),true);
  assert.equal(JSON.parse(built.files.find((f)=>f.name==='diagnostic-summary.json').text).summaryOnly,true);
  assert.equal(built.zip.length>0,true);
});

test('LX1 pressure queues the export and does not present a completed placeholder',async()=>{
  const {ledgerExportIncomplete}=await import('../src/server.mjs');
  let called=0;
  const engine={resourceResearchDeferred:true,ledgerExportJob:null,db:{async ledgerExportPage(){called+=1;return [];}}};
  const out=ledgerExportIncomplete(engine,'resource_pressure');
  assert.equal(out.collectionComplete,false);
  assert.equal(out.status,'queued');
  assert.equal(called,0);
});

test('SP1 startup preservation keeps the exported inconsistent card and does not rewrite it on later boots',async()=>{
  const {factoryOperatorSettingsPatch,startupSettingsPreservation,freshInstallSettings}=await import('../src/config.mjs');
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const patch=factoryOperatorSettingsPatch();
  for(const flag of ['factoryTradingProfile20261005Applied','athenaArrowCloneApplied','winningCard20261005Applied','card20261006Applied'])assert.equal(flag in patch,false,flag);
  const saved={...freshInstallSettings(),mode:'SIMULATION',liveArmed:false,engineActive:true,auroraDamageControlPercent:60,momentumStakeCents:100,momentumHunterMultiply:1,scarletNeedleMultiply:1,factoryTradingProfile20261005Applied:false,athenaArrowCloneApplied:true,winningCard20261005Applied:true,card20261006Applied:true,resetTimestampMs:1790795597949};
  const engine=Object.create(SagittariusEngine.prototype);
  const writes=[];
  engine.db={async saveSettings(s){writes.push(structuredClone(s));},async audit(){}};
  engine.settings=structuredClone(saved);
  const first=startupSettingsPreservation(engine.settings);
  assert.equal(first.overwrite,false);
  engine.settings=first.settings;
  if(first.sealed.length)await engine.db.saveSettings(engine.settings);
  assert.equal(engine.settings.auroraDamageControlPercent,60);
  assert.equal(engine.settings.momentumStakeCents,100);
  assert.equal(engine.settings.momentumHunterMultiply,1);
  assert.equal(engine.settings.factoryTradingProfile20261005Applied,true);
  assert.equal(engine.settings.resetTimestampMs,1790795597949);
  engine.settings.auroraDamageControlPercent=62;
  engine.settings.scarletNeedleStakeCents=100;
  const second=startupSettingsPreservation(engine.settings);
  assert.equal(second.overwrite,false);
  assert.equal(second.sealed.length,0);
  assert.equal(second.settings.auroraDamageControlPercent,62);
  assert.equal(second.settings.scarletNeedleStakeCents,100);
  const fresh=startupSettingsPreservation(freshInstallSettings());
  assert.equal(fresh.overwrite,false);
  const restored=factoryOperatorSettingsPatch();
  assert.equal(restored.auroraDamageControlPercent,10);
  assert.equal(restored.momentumStakeCents,500);
  assert.equal(restored.card20261006Applied,undefined);
  assert.equal(writes.length,1);
});

test('LX2 operator download returns a zip under resource pressure instead of a queued refusal',async()=>{
  const {startServer}=await import('../src/server.mjs');
  const engine={
    resourceResearchDeferred:true,resourcePressureState:'HARD_RESEARCH_SHED',
    settings:{systemName:'SAGITTARIUS',ownerId:'O',mode:'SIMULATION',resetTimestampMs:0},
    health:{degraded:false},
    db:{
      async ledgerExportPage(){return [{id:'P1',systemName:'SAGITTARIUS',ticker:'KXTEST',eventTicker:'KXTEST',conceptName:'Scarlet Needle',mode:'SIMULATION',status:'open',openedAtMs:10,entryPriceCents:80,count:1,pnlCents:0,entryConfig:{}}];},
      async ledgerExportCount(){return 1;},
    },
  };
  const server=startServer({engine,boot:{status:'running'}},0,new URL('../',import.meta.url));
  await new Promise((r)=>server.once('listening',r));
  try{
    const res=await fetch(`http://127.0.0.1:${server.address().port}/api/diagnostics/download`);
    const body=Buffer.from(await res.arrayBuffer());
    assert.equal(res.status,200);
    assert.equal(res.headers.get('content-type'),'application/zip');
    assert.equal(body.subarray(0,2).toString(),'PK');
    assert.equal(body.toString('utf8').includes('"status":"queued"'),false);
  }finally{await new Promise((r)=>server.close(r));}
});

test('GE OFF exact-ticker lock blocks every attack route, pending seats and restart, while GE ON still joins',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const attacks=['Momentum Hunter','Wave Surfer','Crash Recovery Hunter','Scarlet Needle','Lightning Plasma','Recovery Hunter','Sagittarius Justice Arrow','Athena Exclamation'];
  function engine(settings, rows){
    const e=Object.create(StrategyEngine.prototype);
    e.getSettings=()=>settings;
    e.audit=async()=>{};
    e.db={async openHunterEntriesByTicker(){return rows;}};
    e.activeHunterTickerExposure=StrategyEngine.prototype.activeHunterTickerExposure;
    e.exactTickerExposureClear=StrategyEngine.prototype.exactTickerExposureClear;
    e.hunterEntryPolicyDecision=StrategyEngine.prototype.hunterEntryPolicyDecision;
    e.hunterEventAdmissionState=async()=>({eventCapBlocked:false,cooldownBlocked:false,eventTicker:'E'});
    return e;
  }
  const off={galacticExplosionEnabled:false,mode:'SIMULATION',momentumHunterMultiply:1};
  const occupant=[{id:'R1',conceptName:'Recovery Hunter',ticker:'KXITFMATCH-26OCT06TALBRE-BRE',status:'open',openedAtMs:1}];
  for(const concept of attacks){
    for(const mode of ['SIMULATION','LIVE']){
      const blocked=await engine({...off,mode},occupant).exactTickerExposureClear(concept,{ticker:occupant[0].ticker,eventTicker:'E'},'policy',{crystalWallOverlay:true});
      assert.equal(blocked,false,`${mode} ${concept}`);
    }
  }
  const pending=[{id:'P',conceptName:'Wave Surfer',ticker:'T',status:'entry_pending',openedAtMs:2}];
  assert.equal(await engine(off,pending).exactTickerExposureClear('Scarlet Needle',{ticker:'T'},'policy',{crystalWallOverlay:true}),false);
  const restarted=engine(off,pending);
  assert.equal(await restarted.exactTickerExposureClear('Athena Exclamation',{ticker:'T'},'restart',{crystalWallOverlay:true}),false);
  const on={galacticExplosionEnabled:true,mode:'LIVE',momentumHunterMultiply:1};
  assert.equal(await engine(on,occupant).exactTickerExposureClear('Scarlet Needle',{ticker:occupant[0].ticker},'policy',{crystalWallOverlay:false}),true);
  assert.equal(await engine(on,[{...occupant[0],conceptName:'Scarlet Needle'}]).exactTickerExposureClear('Scarlet Needle',{ticker:occupant[0].ticker},'policy'),false);
});

test('GE OFF multiply 2 keeps cross-attack ticker locks atomic and still allows a second same-attack seat',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const e=Object.create(StrategyEngine.prototype);
  const settings={galacticExplosionEnabled:false,mode:'SIMULATION',momentumHunterMultiply:2,waveSurferMultiply:2};
  e.getSettings=()=>settings;
  e.hunterTickerLocks=new Set();
  const momentum=e.hunterConcurrencyLockKey('Momentum Hunter','TALBRE',settings,1);
  const wave=e.hunterConcurrencyLockKey('Wave Surfer','TALBRE',settings,1);
  const seat2=e.hunterConcurrencyLockKey('Momentum Hunter','TALBRE',settings,2);
  assert.equal(momentum,'TALBRE');
  assert.equal(wave,momentum);
  assert.equal(seat2,momentum);
  assert.equal(e.hunterEntryCommitLockKey('Momentum Hunter','TALBRE',settings,1),e.hunterEntryCommitLockKey('Wave Surfer','TALBRE',settings,2));
  e.hunterTickerLocks.add(momentum);
  assert.equal(e.hunterTickerLocks.has(wave),true);
  const on={galacticExplosionEnabled:true,momentumHunterMultiply:2,waveSurferMultiply:2};
  assert.notEqual(e.hunterConcurrencyLockKey('Momentum Hunter','TALBRE',on,1),e.hunterConcurrencyLockKey('Wave Surfer','TALBRE',on,1));
  e.audit=async()=>{};
  e.db={async openHunterEntriesByTicker(){return [{id:'M1',conceptName:'Momentum Hunter',ticker:'TALBRE',status:'open',openedAtMs:1}];}};
  e.activeHunterTickerExposure=StrategyEngine.prototype.activeHunterTickerExposure;
  e.exactTickerExposureClear=StrategyEngine.prototype.exactTickerExposureClear;
  assert.equal(await e.exactTickerExposureClear('Momentum Hunter',{ticker:'TALBRE'},'policy'),true);
  assert.equal(await e.exactTickerExposureClear('Wave Surfer',{ticker:'TALBRE'},'policy'),false);
});

test('LX3 export timeout keeps the cursor and a retry does not restart',async()=>{
  const {collectLedgerExport}=await import('../src/server.mjs');
  const seen=[];
  const engine={
    settings:{systemName:'SAGITTARIUS',ownerId:'O',mode:'SIMULATION',resetTimestampMs:0},
    health:{},
    db:{
      async ledgerExportCount(){return 2;},
      async ledgerExportPage(_s,q){seen.push(q.afterId||'');if(!q.afterId)return [{id:'P1',systemName:'SAGITTARIUS',ticker:'T',eventTicker:'E',conceptName:'Momentum Hunter',mode:'SIMULATION',status:'closed',openedAtMs:1,closedAtMs:2,entryPriceCents:80,exitPriceCents:90,count:1,pnlCents:7,entryFeeCents:2,exitFeeCents:2,closeReason:'infinity_break',entryConfig:{}}];if(q.afterId==='P1')return [{id:'P2',systemName:'SAGITTARIUS',ticker:'T',eventTicker:'E',conceptName:'Wave Surfer',mode:'SIMULATION',status:'closed',openedAtMs:2,closedAtMs:3,entryPriceCents:80,exitPriceCents:90,count:1,pnlCents:7,entryFeeCents:2,exitFeeCents:2,closeReason:'infinity_break',entryConfig:{}}];return [];},
    },
  };
  const first=await collectLedgerExport(engine,{budgetMs:1000,pageLimit:1,maxPages:1});
  assert.equal(first.incomplete,true);
  assert.equal(engine.ledgerExportJob.status,'partial');
  assert.equal(engine.ledgerExportJob.cursor.afterId,'P1');
  assert.equal(first.built.collectionComplete,false);
  assert.ok(first.built.files.every((f)=>f.bytes<1_000_000));
  const second=await collectLedgerExport(engine,{budgetMs:1000,pageLimit:1});
  assert.equal(second.incomplete,false);
  assert.equal(engine.ledgerExportJob.status,'complete');
  assert.equal(seen[0],'');
  assert.equal(seen[1],'P1');
  const ids=second.built.files.filter((f)=>f.name.startsWith('trades-')).flatMap((f)=>JSON.parse(f.text).records.map((r)=>r.positionId));
  assert.deepEqual(ids,['P2','P1']);
});

test('session card clones the 21:24 diagnostic defaults once and does not touch mode',async()=>{
  const {factoryOperatorSettingsPatch,freshInstallSettings}=await import('../src/config.mjs');
  const card=factoryOperatorSettingsPatch();
  assert.equal(card.auroraDamageControlPercent,10);
  assert.equal(card.maxPositions,1000);
  assert.equal(card.galacticExplosionEnabled,true);
  assert.equal(card.momentumHunterMultiply,1);
  assert.equal(card.waveSurferMultiply,1);
  assert.equal(card.recoveryHunterMultiply,1);
  assert.equal(card.scarletNeedleMultiply,1);
  assert.equal(card.justiceArrowMultiply,1);
  assert.equal(card.athenaExclamationMultiply,1);
  assert.equal(card.lightningPlasmaMultiply,1);
  assert.equal(card.crashRecoveryHunterMultiply,1);
  assert.equal(card.momentumMinEntryCents,74);
  assert.equal(card.momentumMaxEntryCents,88);
  assert.equal(card.waveMaxEntryCents,88);
  assert.equal(card.recoveryMaxEntryCents,88);
  assert.equal(card.athenaExclamationMaxEntryCents,85);
  assert.equal(card.infinityBreakMinNetPerOriginalContractCents,13);
  assert.equal(card.minGameMinutes,30);
  assert.equal(card.maxGameMinutes,120);
  assert.equal(card.hunterCooldownMinutes,181);
  assert.equal('card20261006SessionApplied' in card,false);
  const fresh=freshInstallSettings();
  assert.equal(fresh.card20261006SessionApplied,true);
  assert.equal(fresh.mode,'SIMULATION');
});

test('KS1 Ed25519 signs directly and RSA keeps PSS, query string stays unsigned',async()=>{
  const {generateKeyPairSync,createPublicKey,verify,constants}=await import('node:crypto');
  const {signKalshi}=await import('../src/kalshi.mjs');
  const text='1703123456789GET/trade-api/v2/portfolio/balance';
  const ed=generateKeyPairSync('ed25519');
  const rsa=generateKeyPairSync('rsa',{modulusLength:2048});
  const edPem=ed.privateKey.export({type:'pkcs8',format:'pem'});
  const rsaPem=rsa.privateKey.export({type:'pkcs1',format:'pem'});
  const edSig=signKalshi(edPem,'1703123456789','GET','/trade-api/v2/portfolio/balance?limit=1000');
  const rsaSig=signKalshi(rsaPem,'1703123456789','get','/trade-api/v2/portfolio/balance?limit=1000');
  assert.equal(verify(null,Buffer.from(text),ed.publicKey,Buffer.from(edSig,'base64')),true);
  assert.equal(verify('sha256',Buffer.from(text),{key:rsa.publicKey,padding:constants.RSA_PKCS1_PSS_PADDING,saltLength:32},Buffer.from(rsaSig,'base64')),true);
  assert.equal(Buffer.from(edSig,'base64').length,64);
  assert.equal(Buffer.from(rsaSig,'base64').length,256);
  assert.throws(()=>signKalshi('not-a-key','1','GET','/x'));
});

test('LC1 factory card matches the 08:29 diagnostic trading values and does not arm live',async()=>{
  const {factoryOperatorSettingsPatch}=await import('../src/config.mjs');
  const c=factoryOperatorSettingsPatch();
  assert.equal(c.auroraDamageControlPercent,10);
  assert.equal(c.momentumMinEntryCents,74);
  assert.equal(c.momentumMaxEntryCents,88);
  assert.equal(c.momentumHunterMinCrashCents,7);
  assert.equal(c.momentumHunterMinReboundCents,3);
  assert.equal(c.momentumHunterMinUpwardTicks,7);
  assert.equal(c.waveMaxEntryCents,88);
  assert.equal(c.waveSurferMinReboundCents,3);
  assert.equal(c.waveSurferMinUpwardTicks,7);
  assert.equal(c.recoveryMaxEntryCents,88);
  assert.equal(c.crystalWallMinCrashCents,7);
  assert.equal(c.crystalWallMinReboundCents,3);
  assert.equal(c.crystalWallMinUpwardTicks,7);
  assert.equal(c.crashRecoveryHunterMinReboundCents,0);
  assert.equal(c.scarletNeedleMinCrashCents,7);
  assert.equal(c.scarletNeedleMinUpwardTicks,7);
  assert.equal(c.justiceArrowMinReboundCents,3);
  assert.equal(c.lightningPlasmaMinCrashCents,7);
  assert.equal(c.lightningPlasmaMinUpwardTicks,7);
  assert.equal(c.galacticExplosionEnabled,true);
  assert.equal(c.momentumHunterMultiply,1);
  assert.equal('mode' in c,false);
  assert.equal('liveArmed' in c,false);
});

test('CQ1 older scan price cannot become a fresh crash and a drop clears sealed ticks',async()=>{
  const {advanceCrashState}=await import('../src/learning.mjs');
  const {independentCi1SignalState}=await import('../src/strategy.mjs');
  let state=advanceCrashState(null,{ticker:'T',yesBid:70,yesAsk:71},{},1000).state;
  state=advanceCrashState(state,{ticker:'T',yesBid:90,yesAsk:91},{},2000).state;
  const replay=advanceCrashState(state,{ticker:'T',yesBid:70,yesAsk:71},{},1500);
  assert.equal(replay.transition,'STALE_OBSERVATION');
  assert.equal(replay.state.lastBidCents,90);
  const settings={waveSurferMinCrashCents:7,waveSurferMinReboundCents:3,waveSurferMinUpwardTicks:7,waveMinEntryCents:80,waveMaxEntryCents:88};
  const live=independentCi1SignalState('Wave Surfer',{lastBidCents:81,troughCents:65,upwardTicks:7,preCrashPeakCents:90,crashDepthCents:25,reboundCents:16},{yesBid:79,yesAsk:80},settings,4000);
  assert.equal(live.upwardTicks,0);
  assert.equal(live.qualified,false);
});

test('CQ2 same-time price regression is not a fresh crash and production export reads nested fire evidence',async()=>{
  const {advanceCrashState}=await import('../src/learning.mjs');
  const {independentCi1SignalState}=await import('../src/strategy.mjs');
  let state=advanceCrashState(null,{ticker:'T',yesBid:90,yesAsk:91},{},2000).state;
  const same=advanceCrashState(state,{ticker:'T',yesBid:70,yesAsk:71},{},2000);
  assert.equal(same.transition,'STALE_OBSERVATION');
  assert.equal(same.state.lastBidCents,90);
  const dip=independentCi1SignalState('Wave Surfer',{lastBidCents:81,troughCents:65,upwardTicks:7,preCrashPeakCents:90,crashDepthCents:25,reboundCents:16},{yesBid:79,yesAsk:80},{waveSurferMinCrashCents:7,waveSurferMinReboundCents:3,waveSurferMinUpwardTicks:7,waveMinEntryCents:80,waveMaxEntryCents:88},4500);
  const recovered=independentCi1SignalState('Wave Surfer',dip,{yesBid:81,yesAsk:82},{waveSurferMinCrashCents:7,waveSurferMinReboundCents:3,waveSurferMinUpwardTicks:7,waveMinEntryCents:80,waveMaxEntryCents:88},5000);
  assert.equal(recovered.upwardTicks,1);
  assert.equal(recovered.qualified,false);
  const {projectLedgerRecord}=await import('../src/server.mjs');
  const row={id:'1',ticker:'T',eventTicker:'T',conceptName:'Wave Surfer',systemName:'SAGITTARIUS',mode:'SIMULATION',status:'closed',openedAtMs:1,closedAtMs:2,entryPriceCents:80,exitPriceCents:93,count:1,remainingCount:0,pnlCents:13,entryFeeCents:2,exitFeeCents:2,entryConfig:{ci1WallCloneFire:{operatorMinEntryCents:80,operatorMaxEntryCents:88,decisionEvidence:{ci1WallClone:{crashEpisodeId:'CRASH:T:1',minUpwardTicks:7,lastBidCents:81,minEntryCents:80}}},athenaExit:{minimumProfitNetPerOriginalContractCents:13},profitAuthority:'ATHENA-X1'}};
  const projected=projectLedgerRecord(row,0);
  assert.equal(projected.crashEpisodeId,'CRASH:T:1');
  assert.equal(projected.snapshotId.length,16);
});

test('CQ3 actual startup preserves a saved card even with every migration flag missing',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {originalSettings,SETTINGS_MIGRATION_FLAGS,EDITABLE_NUMERIC_SETTINGS,EDITABLE_BOOLEAN_SETTINGS,env}=await import('../src/config.mjs');
  const base={...originalSettings(),mode:'LIVE',liveArmed:true,engineActive:false,resetTimestampMs:123456,auroraDamageControlPercent:65,momentumStakeCents:100,momentumMinEntryCents:72,momentumMaxEntryCents:83,galacticExplosionEnabled:false,momentumHunterMultiply:1};
  for(const k of SETTINGS_MIGRATION_FLAGS)delete base[k];
  let saved=structuredClone(base);const audits=[],stop=new Error('STOP_BEFORE_NETWORK');
  for(let restart=0;restart<3;restart++){
    const engine=Object.create(SagittariusEngine.prototype);
    engine.db={init:async()=>{},loadSettings:async()=>structuredClone(saved),saveSettings:async s=>{saved=structuredClone(s);},audit:async(_l,event)=>audits.push(event),saveDeploymentConfig:async()=>{},loadCredentials:async()=>{throw stop;}};
    await assert.rejects(engine.init(),e=>e===stop);
    for(const k of [...EDITABLE_NUMERIC_SETTINGS,...EDITABLE_BOOLEAN_SETTINGS].filter(k=>!SETTINGS_MIGRATION_FLAGS.includes(k)&&k!=='liveArmed'))assert.deepEqual(engine.settings[k],base[k],k);
    assert.equal(engine.settings.resetTimestampMs,123456);assert.equal(engine.settings.mode,env.allowLiveTrading?'LIVE':'SIMULATION');assert.equal(engine.settings.liveArmed,false);
  }
  assert.equal(audits.some(e=>/card_.*applied|factory_trading_profile_applied/.test(e)),false);
});

test('CQ3 lossless oversized evidence and snapshot partitions stay below one MB',async()=>{
  const {buildLedgerExportPackage}=await import('../src/server.mjs');
  const {BUILD_INFO}=await import('../src/authority.mjs');const {createHash}=await import('node:crypto');
  const rows=Array.from({length:1800},(_,i)=>({id:'CQ3-'+i,systemName:'CQ3',ticker:'T'+i,eventTicker:'E',conceptName:'Momentum Hunter',mode:'SIMULATION',status:'closed',openedAtMs:i+1,closedAtMs:4000,pnlCents:13,count:1,entryConfig:{release:'HISTORICAL',stakeCents:500+i,hunter:{minEntryCents:75,maxEntryCents:85},profitAuthority:'ATHENA-X1',minProfitNetPerOriginalContractCents:13}}));
  rows[0].entryConfig.decisionEvidence={fullPath:'é🎯'.repeat(210000)};
  const built=buildLedgerExportPackage({records:rows,maxBytes:120000,meta:{exportId:'CQ3',systemName:'CQ3',snapshotCutoffMs:5000,expectedCount:rows.length}});
  assert.ok(built.zip.length<=1_000_000);
  assert.equal(built.files.some(f=>f.kind==='entry-evidence'),false);
  const trades=built.files.filter(f=>f.name.startsWith('trades-')).flatMap(f=>JSON.parse(f.text).records);
  assert.ok(trades.length>0&&trades.length<rows.length);
  assert.equal(built.manifest.coverage.rawEvidenceOmitted||built.manifest.coverage.gaps.includes('raw_entry_evidence_omitted_to_keep_download_under_1mb')||built.manifest.coverage.packageCapped,true);
  const snapshots=built.files.filter(f=>f.kind==='snapshots').flatMap(f=>JSON.parse(f.text).snapshots);
  if(snapshots.length){assert.equal(snapshots[0].snapshot.executionBuild,null);assert.equal(snapshots[0].snapshot.minEntryCents,75);}
  assert.equal(built.manifest.exporterBuild.id,BUILD_INFO.id);
  for(const f of built.files){assert.ok(f.bytes<1_000_000,f.name);assert.equal(f.bytes,Buffer.byteLength(f.text));}
  for(const f of built.manifest.files)assert.equal(createHash('sha256').update(built.files.find(p=>p.name===f.name).text).digest('hex'),f.sha256);
});

test('CQ3 export resumes only its original system/mode/reset/filter cohort',async()=>{
  const {collectLedgerExport}=await import('../src/server.mjs');
  const calls=[];const engine={settings:{systemName:'CQ3',mode:'SIMULATION',resetTimestampMs:0},db:{ledgerExportCount:async()=>2,ledgerExportPage:async(_s,o)=>{calls.push({...o});return o.afterId?[]:[{id:o.mode,openedAtMs:1,mode:o.mode,entryConfig:{}}];}}};
  await collectLedgerExport(engine,{pageLimit:1,maxPages:1});engine.settings.mode='LIVE';
  const next=await collectLedgerExport(engine,{pageLimit:1,maxPages:1});
  assert.equal(calls[1].afterId,'');assert.equal(engine.ledgerExportJob.rows.length,1);assert.equal(engine.ledgerExportJob.rows[0].mode,'LIVE');assert.equal(next.built.manifest.mode,'LIVE');
  engine.settings.resetTimestampMs=7;await collectLedgerExport(engine,{pageLimit:1,maxPages:1});assert.equal(calls[2].afterId,'');assert.equal(calls[2].resetTimestampMs,7);
});

test('CQ3 simultaneous downloads serialize cursor ownership without duplicated rows',async()=>{
  const {collectLedgerExport}=await import('../src/server.mjs');
  let inFlight=0,maximum=0;const engine={settings:{systemName:'CQ3',mode:'SIMULATION'},db:{ledgerExportCount:async()=>2,ledgerExportPage:async(_s,o)=>{maximum=Math.max(maximum,++inFlight);await new Promise(r=>setImmediate(r));inFlight--;return o.afterId==='P2'?[]:[{id:o.afterId?'P2':'P1',openedAtMs:o.afterId?2:1,entryConfig:{}}];}}};
  const [first,second]=await Promise.all([collectLedgerExport(engine,{pageLimit:1,maxPages:1}),collectLedgerExport(engine,{pageLimit:1,maxPages:10})]);
  assert.equal(maximum,1);assert.equal(first.incomplete,true);assert.equal(second.incomplete,false);assert.equal(second.built.manifest.coverage.exported,2);assert.deepEqual(second.built.manifest.coverage.duplicateIds,[]);
});

test('CQ3 reset during collection cannot produce a mixed or falsely complete export',async()=>{
  const {collectLedgerExport}=await import('../src/server.mjs');
  const engine={settings:{systemName:'CQ3',mode:'SIMULATION',resetTimestampMs:0},db:{ledgerExportPage:async()=>{engine.settings.resetTimestampMs=10;return[];},ledgerExportCount:async()=>0}};
  await assert.rejects(collectLedgerExport(engine),/export_context_changed_retry/);assert.equal(engine.ledgerExportJob,null);assert.equal(engine.ledgerExportInFlight,null);
});

test('CQ3 scanner keeps every active crash and watch, and prunes only terminal watches',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');const engine=Object.create(SagittariusEngine.prototype);
  engine.learning={crashStates:new Map(Array.from({length:150},(_,i)=>['T'+i,{ticker:'T'+i,phase:'CRASHING'}]))};
  engine.market={getQuote:ticker=>({status:ticker==='FINAL'?'settled':'active'})};
  engine.ci1ConsumedEpisodes=new Set(['DO-NOT-CLEAR']);engine.crystalWallWatches=new Map([['live',{ticker:'WATCH-ONLY',status:'READY'}]]);engine.justiceArrowWatches=new Map([['final',{ticker:'FINAL'}]]);engine.ci1CloneWatches=new Map([['expired',{ticker:'EXPIRED',status:'EXPIRED'}]]);
  const priority=engine.refreshCrashPriorityTickers();assert.equal(priority.size,151);assert.equal(priority.has('T0'),true);assert.equal(priority.has('WATCH-ONLY'),true);assert.equal(engine.justiceArrowWatches.size,0);assert.equal(engine.ci1CloneWatches.size,0);assert.equal(engine.ci1ConsumedEpisodes.has('DO-NOT-CLEAR'),true);
});

test('CQ3 blocked LIVE intents do not count as open exposure or traded contracts in exports',async()=>{
  const {buildLedgerExportPackage}=await import('../src/server.mjs');
  const built=buildLedgerExportPackage({records:[{id:'blocked',status:'rejected',count:6,remainingCount:0,openedAtMs:1,entryConfig:{}}],meta:{systemName:'CQ3',exportId:'blocked',snapshotCutoffMs:2,expectedCount:1}});
  assert.equal(built.manifest.expectedTotals.open,0);assert.equal(built.manifest.expectedTotals.contracts,0);assert.equal(built.manifest.expectedTotals.nonPositions,1);assert.equal(built.manifest.coverage.exported,1);
});

test('CQ3 a close after the cutoff cannot become a zero-profit closed trade in that snapshot',async()=>{
  const {projectLedgerRecord,reconcileLedger}=await import('../src/server.mjs');
  const row=projectLedgerRecord({id:'later',status:'closed',openedAtMs:1,closedAtMs:20,updatedAtMs:20,count:6,remainingCount:0,pnlCents:-300,entryConfig:{}},10);
  assert.equal(row.status,'open');assert.equal(row.remainingQuantity,6);assert.equal(row.unrealizedNetCents,null);assert.equal(reconcileLedger([row]).combinedCents,null);assert.equal(reconcileLedger([row]).closed,0);
});

test('CQ4 ordinary Athena submit rechecks a stopped engine and keeps confirmation on an ambiguous fill',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  assert.match(source,/route:'ordinary_athena'/);
  assert.match(source,/entryConfig:\{...pendingConfig,finalEntryConfirmation/);
  assert.doesNotMatch(source,/if\(!independentCrashRecoveryEntry\)return \{ok:true\};/);
});

test('Freezing Coffin sells a 3-cent drop in simulation and live, and leaves Aurora in force when off',async()=>{
  const {profitGuardDecision}=await import('../src/profitGuard.mjs');
  const {freezingCoffinSnapshot}=await import('../src/doctrine.mjs');
  const coffin=freezingCoffinSnapshot({entryPriceCents:80,maxDropCents:3});
  const entry=(mode,active)=>({id:'1',conceptName:'Momentum Hunter',mode,status:'open',entryPriceCents:80,currentPriceCents:80,peakPriceCents:80,stopPriceCents:24,stopLossCents:56,entryConfig:{aurora:{version:'AURORA-V2',frozen:true,stopDistanceCents:56,dangerPriceCents:24},...(active?{freezingCoffin:coffin}:{})}});
  const quote=(bid)=>({yesBid:bid,yesAsk:bid+1,status:'active'});
  for(const mode of ['SIMULATION','LIVE']){
    assert.equal(profitGuardDecision(entry(mode,true),quote(78),{}).action,'hold');
    const sell=profitGuardDecision(entry(mode,true),quote(77),{});
    assert.equal(sell.action,'hard_stop');
    assert.equal(sell.stopPriceCents,77);
    assert.equal(profitGuardDecision(entry(mode,true),quote(65),{}).liveExitPriceCents,65);
  }
  assert.equal(profitGuardDecision(entry('SIMULATION',false),quote(77),{}).action,'hold');
});

test('Freezing Coffin sells immediately in simulation and live protection and does not enter Aurora recovery',async()=>{
  const {ProfitGuard}=await import('../src/profitGuard.mjs');
  const {freezingCoffinSnapshot}=await import('../src/doctrine.mjs');
  const coffin=freezingCoffinSnapshot({entryPriceCents:80,maxDropCents:3});
  for(const mode of ['SIMULATION','LIVE']){
    const exits=[];
    const guard=new ProfitGuard({
      db:{updateEntry:async()=>{},entryById:async()=>null},
      kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},
      market:{
        ensureFreshBook:async()=>null,
        getQuote:()=>({ticker:'T',yesBid:77,yesAsk:78,updatedAtMs:Date.now(),status:'active',bookInvalid:false}),
        getBook:()=>({updatedAtMs:Date.now()}),
        executableBid:()=>({full:true,filled:6,avgCents:77}),
      },
      learning:{onHardStop:async()=>{}},
      getSettings:()=>({mode,simFeeCents:2}),
    });
    guard.simulationExit=async(entry,decision)=>{exits.push({mode:entry.mode,reason:decision.guardState,price:decision.liveExitPriceCents});return {closed:true};};
    guard.liveExit=async(entry,decision)=>{exits.push({mode:entry.mode,reason:decision.guardState,price:decision.liveExitPriceCents});return {closed:true};};
    const entry={id:'1',ticker:'T',conceptName:'Momentum Hunter',mode,status:'open',count:6,remainingCount:6,entryPriceCents:80,currentPriceCents:80,peakPriceCents:80,stopGuardState:{},entryConfig:{aurora:{version:'AURORA-V2',frozen:true,stopDistanceCents:56,dangerPriceCents:24},freezingCoffin:coffin}};
    const out=await guard.handleUltimateStopGuard(entry,{ticker:'T',yesBid:77,yesAsk:78,updatedAtMs:Date.now(),status:'active'},{mode,simFeeCents:2},{action:'hard_stop'});
    assert.equal(out.handled,true);
    assert.equal(exits.length,1);
    assert.equal(exits[0].mode,mode);
    assert.equal(exits[0].reason,'FREEZING_COFFIN_EXIT');
    assert.equal(exits[0].price,77);
    assert.equal(entry.stopGuardState.phase==='USG1_RECOVERY_ZONE',false);
  }
});

test('observation wait holds the bolt and enters alone only if the attack band still holds',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  for(const mode of ['SIMULATION','LIVE']){
    const audits=[];
    const engine=new StrategyEngine({db:{audit:async(_l,_e,d)=>audits.push(d)},kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},market:{getQuote:()=>({ticker:'T',yesAsk:84,yesBid:83,status:'active'})},learning:{},getSettings:()=>({mode,liveArmed:true,momentumMinEntryCents:83,momentumMaxEntryCents:88,momentumHunterObservationMinutes:45}),getLiveReady:()=>true});
    engine.recordEntryPipeline=()=>{};
    const opened=await engine.createHunter('Momentum Hunter',{ticker:'T',yesAsk:84,yesBid:83,status:'active'},500,0,{ci1SourceSnapshot:{authorizationId:'A',crashEpisodeId:'EP1'}});
    assert.equal(opened,null);
    assert.equal(engine.observationWaits.has('Momentum Hunter|T|EP1'),true);
    await engine.releaseObservationWaits(Date.now());
    assert.equal(engine.observationWaits.has('Momentum Hunter|T|EP1'),true);
    engine.createHunter=async(_c,q,_s,_l,opts)=>{assert.equal(opts.observationRelease,true);assert.equal(q.yesAsk,84);return {id:'entered',mode};};
    await engine.releaseObservationWaits(Date.now()+45*60_000);
    assert.equal(engine.observationWaits.size,0);
    const blocked=new StrategyEngine({db:{audit:async()=>{}},kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},market:{getQuote:()=>({ticker:'T',yesAsk:90,yesBid:89,status:'active'})},learning:{},getSettings:()=>({mode,momentumMinEntryCents:83,momentumMaxEntryCents:88,momentumHunterObservationMinutes:1}),getLiveReady:()=>true});
    blocked.recordEntryPipeline=()=>{};
    blocked.observationWaits=new Map([['Momentum Hunter|T',{concept:'Momentum Hunter',ticker:'T',stakeCents:500,releaseAtMs:Date.now()-1,spawn:{}}]]);
    let called=false;
    blocked.createHunter=async()=>{called=true;};
    await blocked.releaseObservationWaits(Date.now());
    assert.equal(called,false);
  }
});

test('delayed release uses the live watch and real executor, and rejects a deteriorated signal',async()=>{
  const {StrategyEngine,independentCi1SignalState}=await import('../src/strategy.mjs');
  const quote={ticker:'T',eventTicker:'E',yesAsk:80,yesBid:79,status:'active',updatedAtMs:Date.now()};
  const watch={authorizationId:'CI1-WALL-CLONE:Momentum Hunter:EP1',crashEpisodeId:'EP1',ticker:'T',eventTicker:'E',preCrashPeakCents:94,troughCents:76,lastBidCents:78,upwardTicks:7,crashDepthCents:18,crashStartedAtMs:Date.now()-60_000};
  const settings={mode:'SIMULATION',systemName:'SAGITTARIUS',ownerId:'o',engineActive:true,momentumHunterEnabled:true,momentumHunterObservationMinutes:15,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:500,momentumHunterMinCrashCents:7,momentumHunterMinReboundCents:3,momentumHunterMinUpwardTicks:7,infinityBreakMinNetPerOriginalContractCents:13,maxSpreadCents:3,simFeeCents:0,galacticExplosionEnabled:false};
  for(const mode of ['SIMULATION','LIVE']){
    const traces=[];
    const engine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(e)=>e,updateEntry:async()=>{},entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({})}},kalshi:{buildClientOrderId:()=>'cid',placeOrder:async()=>({orderId:'1',filledCount:6,avgPriceCents:80,feePaidCents:0})},market:{getQuote:()=>quote,refreshTicker:async()=>quote,getBook:()=>({updatedAtMs:Date.now()}),executableBid:()=>({full:true,filled:6,avgCents:79}),executableAsk:()=>({full:true,filled:6,avgCents:80}),ensureFreshBook:async()=>null},learning:{},getSettings:()=>({...settings,mode}),getLiveReady:()=>true,getCurrentCrashWatch:()=>watch,captureSimulationMutationToken:()=>'tok',enterSimulationMutation:()=>()=>{}});
    engine.recordEntryPipeline=(id,c,ticker,stage,status,reason)=>traces.push([stage,status,reason]);
    engine.observationWaits=new Map([['Momentum Hunter|T|EP1',{concept:'Momentum Hunter',ticker:'T',armedAtMs:Date.now()-16*60_000,minutes:30,authorizationId:watch.authorizationId,crashEpisodeId:watch.crashEpisodeId}]]);
    await engine.releaseObservationWaits(Date.now());
    assert.equal(quote.confirmation,undefined);
    assert.ok(traces.some((row)=>row[0]==='CI1_WALL_CLONE_AUTHORITY'&&row[1]==='PASS'), traces.join('|'));
    assert.equal(traces.some((row)=>String(row[2]||'').includes('expired')),false);
    const bad={...watch,troughCents:79,lastBidCents:79,upwardTicks:0,crashDepthCents:1,preCrashPeakCents:80};
    assert.equal(independentCi1SignalState('Momentum Hunter',bad,quote,{...settings,mode},Date.now()).qualified,false);
  }
});

test('a release skip belongs only to that watch, and zero minutes does not keep the old clock',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const settings={mode:'SIMULATION',systemName:'SAGITTARIUS',waveSurferObservationMinutes:30,momentumHunterObservationMinutes:60,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:500};
  for(const mode of ['SIMULATION','LIVE']){
    const engine=new StrategyEngine({db:{audit:async()=>{}},kalshi:{},market:{getQuote:()=>({ticker:'T',yesAsk:84,yesBid:83,status:'active'})},learning:{},getSettings:()=>({...settings,mode}),getLiveReady:()=>true,getCurrentCrashWatch:()=>({crashEpisodeId:'EP1',authorizationId:'A',ticker:'T'})});
    engine.recordEntryPipeline=()=>{};
    engine.observationWaits=new Map([['Wave Surfer|T',{concept:'Wave Surfer',ticker:'T',armedAtMs:Date.now()-31*60_000,minutes:30,authorizationId:'A',crashEpisodeId:'EP1'}]]);
    engine.executeIndependentCi1Attack=async()=>{
      const opened=await engine.createHunter('Momentum Hunter',{ticker:'T',yesAsk:84,yesBid:83,status:'active'},500,0,{ci1SourceSnapshot:{authorizationId:'A',crashEpisodeId:'EP1'}});
      assert.equal(opened,null);
      assert.equal(engine.observationWaits.has('Momentum Hunter|T'),true);
    };
    await engine.releaseObservationWaits(Date.now());
    const zero=new StrategyEngine({db:{audit:async()=>{}},kalshi:{},market:{getQuote:()=>({ticker:'T',yesAsk:84,yesBid:83,status:'active'})},learning:{},getSettings:()=>({...settings,mode,waveSurferObservationMinutes:0}),getLiveReady:()=>true,getCurrentCrashWatch:()=>({crashEpisodeId:'EP1',authorizationId:'A',ticker:'T',preCrashPeakCents:94,troughCents:76,lastBidCents:78,upwardTicks:7,crashDepthCents:18})});
    zero.recordEntryPipeline=()=>{};
    let released=false;
    zero.observationWaits=new Map([['Wave Surfer|T',{concept:'Wave Surfer',ticker:'T',armedAtMs:Date.now()-20*60_000,minutes:30,authorizationId:'A',crashEpisodeId:'EP1'}]]);
    zero.executeIndependentCi1Attack=async()=>{released=true;};
    await zero.releaseObservationWaits(Date.now());
    assert.equal(released,true);
  }
});

test('a new episode cannot borrow a release, and a failed restore cannot wipe the queue',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  for(const mode of ['SIMULATION','LIVE']){
    const engine=new StrategyEngine({db:{audit:async()=>{}},kalshi:{},market:{},learning:{},getSettings:()=>({mode,momentumHunterObservationMinutes:60,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:500}),getLiveReady:()=>true});
    engine.recordEntryPipeline=()=>{};
    engine.observationReleaseAttempt={key:'Momentum Hunter|T|EP1',attemptId:'EP1:1'};
    const opened=await engine.createHunter('Momentum Hunter',{ticker:'T',yesAsk:84,yesBid:83,status:'active'},500,0,{ci1SourceSnapshot:{authorizationId:'A2',crashEpisodeId:'EP2'}});
    assert.equal(opened,null);
    assert.equal(engine.observationWaits.has('Momentum Hunter|T|EP2'),true);
    const writes=[];
    const failed=new StrategyEngine({db:{audit:async()=>{},pool:{query:async()=>{throw new Error('db down');}}},kalshi:{},market:{},learning:{},getSettings:()=>({mode}),getLiveReady:()=>true});
    failed.observationWaits=new Map([['Momentum Hunter|T|EP1',{armedAtMs:1,crashEpisodeId:'EP1'}]]);
    await failed.restoreObservationWaits();
    assert.equal(failed.observationRestoreState,'failed');
    await failed.persistObservationWaits();
    assert.equal(failed.observationWaits.size,1);
  }
});

test('a Galactic child keeps its own watch, an old key keeps its start, and a failed restore retries',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const watches=new Map();
  const engine=new StrategyEngine({db:{audit:async()=>{},pool:{query:async()=>({rows:[{value:{'Momentum Hunter|T':{concept:'Momentum Hunter',ticker:'T',armedAtMs:Date.now()-61*60_000,minutes:60,authorizationId:'A',crashEpisodeId:'EP1'}}}]})}},kalshi:{},market:{},learning:{},getSettings:()=>({mode:'SIMULATION',momentumHunterObservationMinutes:60}),getLiveReady:()=>true,getCurrentCrashWatch:(concept,id,episode)=>watches.get(`${concept}|${id}|${episode}`)||null,registerObservationWatch:(concept,watch)=>watches.set(`${concept}|${watch.authorizationId}|${watch.crashEpisodeId}`,watch)});
  await engine.restoreObservationWaits();
  const row=engine.observationWaits.get('Momentum Hunter|T|EP1');
  assert.ok(row);
  assert.ok(Date.now()-row.armedAtMs>60*60_000);
  engine.observationRestoreState='failed';
  engine.observationWaits=new Map();
  engine.db.pool.query=async()=>{throw new Error('down');};
  await engine.restoreObservationWaits();
  assert.equal(engine.observationRestoreState,'failed');
  engine.db.pool.query=async()=>({rows:[{value:{'Wave Surfer|T|EP9':{concept:'Wave Surfer',ticker:'T',armedAtMs:5,minutes:60,authorizationId:'C',crashEpisodeId:'EP9'}}}]});
  await engine.restoreObservationWaits();
  assert.equal(engine.observationRestoreState,'ready');
  assert.equal(engine.observationWaits.get('Wave Surfer|T|EP9').armedAtMs,5);
  await engine.armObservationWait({concept:'Scarlet Needle',ticker:'T',authorizationId:'CHILD',crashEpisodeId:'EP7',armedAtMs:Date.now(),minutes:15,parentAuthorizationId:'PARENT'});
  assert.equal(watches.get('Scarlet Needle|CHILD|EP7').parentAuthorizationId,'PARENT');
  assert.equal(engine.getCurrentCrashWatch('Scarlet Needle','CHILD','EP7').crashEpisodeId,'EP7');
});

test('a mature Momentum wait opens through the real executor and an early wait does not',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const {originalSettings}=await import('../src/config.mjs');
  const opened=[];
  const settings={...originalSettings(),mode:'SIMULATION',systemName:'SAGITTARIUS',engineActive:true,momentumHunterEnabled:true,momentumHunterObservationMinutes:15,momentumHunterMinCrashCents:0,momentumHunterMinReboundCents:0,momentumHunterMinUpwardTicks:0,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:100,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,minGameMinutes:0,maxGameMinutes:0};
  const engine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>{opened.push(row);return {...row,id:'filled-1'};},openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})}},kalshi:{buildClientOrderId:()=>'c1',placeOrder:async()=>({orderId:'o1',status:'executed',fillCount:1,averageFillPriceCents:84,feePaidCents:2})},market:{getQuote:(t)=>({ticker:t,eventTicker:t,yesBid:83,yesAsk:84,status:'active',updatedAtMs:Date.now()}),subscribeQuote:()=>()=>{},refreshTicker:async(t)=>({quote:{ticker:t,yesBid:83,yesAsk:84,status:'active'}}),refreshTickerVerified:async(t)=>({quote:{ticker:t,yesBid:83,yesAsk:84,status:'active'},marketFresh:true,bookFresh:true}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:83,count:100}],noBids:[{priceCents:16,count:100}]}),executableAsk:()=>({filled:1,full:true,avgCents:84,bestCents:84}),executableBid:()=>({filled:1,full:true,avgCents:83,bestCents:83}),quoteAgeMs:()=>0,bookAgeMs:()=>0},learning:{},getSettings:()=>settings,getLiveReady:()=>true,getCurrentCrashWatch:()=>({ticker:'T',authorizationId:'A',crashEpisodeId:'EP1',preCrashPeakCents:94,troughCents:76,lastBidCents:78,upwardTicks:7,crashDepthCents:18,reboundCents:6}),registerObservationWatch:()=>{}});
  engine.recordEntryPipeline=()=>{};
  await engine.armObservationWait({concept:'Momentum Hunter',ticker:'T',authorizationId:'A',crashEpisodeId:'EP1',armedAtMs:Date.now(),minutes:15});
  await engine.releaseObservationWaits(Date.now());
  assert.equal(opened.length,0);
  engine.observationWaits.get('Momentum Hunter|T|EP1').armedAtMs=Date.now()-16*60_000;
  await engine.releaseObservationWaits(Date.now());
  assert.equal(opened.length,1);
  assert.equal(opened[0].conceptName,'Momentum Hunter');
});

test('all eight mature waits open through the real release, an early or rejected wait does not, and profit guard can close the fill',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const {originalSettings}=await import('../src/config.mjs');
  const {profitGuardDecision}=await import('../src/profitGuard.mjs');
  const attacks=[
    ['Momentum Hunter','momentumHunterObservationMinutes','momentumHunterEnabled','momentumHunterMinCrashCents','momentumHunterMinReboundCents','momentumHunterMinUpwardTicks','momentumMinEntryCents','momentumMaxEntryCents','momentumStakeCents'],
    ['Wave Surfer','waveSurferObservationMinutes','waveSurferEnabled','waveSurferMinCrashCents','waveSurferMinReboundCents','waveSurferMinUpwardTicks','waveMinEntryCents','waveMaxEntryCents','waveStakeCents'],
    ['Scarlet Needle','scarletNeedleObservationMinutes','scarletNeedleEnabled','scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks','scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents','scarletNeedleStakeCents'],
    ['Lightning Plasma','lightningPlasmaObservationMinutes','lightningPlasmaEnabled','lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks','lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents','lightningPlasmaFieldStakeCents'],
    ['Recovery Hunter','crystalWallObservationMinutes','recoveryHunterEnabled','crystalWallMinCrashCents','crystalWallMinReboundCents','crystalWallMinUpwardTicks','recoveryMinEntryCents','recoveryMaxEntryCents','recoveryStakeCents'],
    ['Sagittarius Justice Arrow','justiceArrowObservationMinutes','justiceArrowEnabled','justiceArrowMinCrashCents','justiceArrowMinReboundCents','justiceArrowMinUpwardTicks','justiceArrowMinEntryCents','justiceArrowMaxEntryCents','justiceArrowStakeCents'],
    ['Athena Exclamation','athenaExclamationObservationMinutes','athenaExclamationEnabled','athenaExclamationMinCrashCents','athenaExclamationMinReboundCents','athenaExclamationMinUpwardTicks','athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents','athenaExclamationStakeCents'],
  ];
  for(const mode of ['SIMULATION','LIVE']){
    const settings={...originalSettings(),mode,systemName:'SAGITTARIUS',engineActive:true,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,minGameMinutes:0,maxGameMinutes:0,galacticExplosionEnabled:false};
    for(const row of attacks){settings[row[1]]=15;settings[row[2]]=true;settings[row[3]]=0;settings[row[4]]=0;settings[row[5]]=0;settings[row[6]]=80;settings[row[7]]=88;settings[row[8]]=100;}
    const opened=[];
    const watches=new Map();
    const market={getQuote:(t)=>({ticker:t,eventTicker:t,yesBid:83,yesAsk:84,status:'active',updatedAtMs:Date.now()}),subscribeQuote:()=>()=>{},refreshTicker:async(t)=>({quote:{ticker:t,yesBid:83,yesAsk:84,status:'active'}}),refreshTickerVerified:async(t)=>({quote:{ticker:t,yesBid:83,yesAsk:84,status:'active'},marketFresh:true,bookFresh:true}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:83,count:100}],noBids:[{priceCents:16,count:100}]}),executableAsk:()=>({filled:1,full:true,avgCents:84,bestCents:84}),executableBid:()=>({filled:1,full:true,avgCents:83,bestCents:83}),quoteAgeMs:()=>0,bookAgeMs:()=>0};
    const engine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>{opened.push(row);return {...row,id:`id-${opened.length}`};},updateEntry:async()=>{},openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})}},kalshi:{buildClientOrderId:()=>'c1',placeOrder:async()=>({orderId:'o1',status:'executed',fillCount:1,averageFillPriceCents:84,feePaidCents:2})},market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,getCurrentCrashWatch:(concept,id,episode)=>watches.get(`${concept}|${id}|${episode}`)||null,registerObservationWatch:(concept,row)=>watches.set(`${concept}|${row.authorizationId}|${row.crashEpisodeId}`,row)});
    engine.recordEntryPipeline=()=>{};
    for(const [concept] of attacks){
      const w={ticker:'T',eventTicker:'T',authorizationId:`A-${concept}`,crashEpisodeId:`EP-${concept}`,preCrashPeakCents:94,troughCents:76,lastBidCents:83,upwardTicks:7,crashDepthCents:18,reboundCents:6};
      watches.set(`${concept}|${w.authorizationId}|${w.crashEpisodeId}`,w);
      await engine.armObservationWait({concept,ticker:'T',authorizationId:w.authorizationId,crashEpisodeId:w.crashEpisodeId,armedAtMs:Date.now(),minutes:15,parentAuthorizationId:'PARENT'});
    }
    await engine.releaseObservationWaits(Date.now());
    assert.equal(opened.length,0);
    for(const [key,row] of engine.observationWaits)engine.observationWaits.set(key,{...row,armedAtMs:Date.now()-16*60_000});
    await engine.releaseObservationWaits(Date.now());
    assert.deepEqual(opened.map(r=>r.conceptName).sort(),attacks.map(r=>r[0]).sort());
    const decision=profitGuardDecision({...opened[0],currentPriceCents:84,peakPriceCents:92,count:1,remainingCount:1,stopLossCents:10},{yesBid:92,result:''},settings);
    assert.ok(['infinity_break','hold','settlement'].includes(decision.action));
    const rejected=[];
    const rejectEngine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>{rejected.push({...row});return {...row,id:'rej'};},updateEntry:async(id,patch)=>{rejected.push({id,...patch});},openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})}},kalshi:{buildClientOrderId:()=>'c2',placeOrder:async()=>({orderId:'o2',status:'canceled',fillCount:0})},market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,getCurrentCrashWatch:()=>watches.get('Momentum Hunter|A-Momentum Hunter|EP-Momentum Hunter'),registerObservationWatch:()=>{}});
    rejectEngine.recordEntryPipeline=()=>{};
    await rejectEngine.armObservationWait({concept:'Momentum Hunter',ticker:'T',authorizationId:'A-Momentum Hunter',crashEpisodeId:'EP-Momentum Hunter',armedAtMs:Date.now()-16*60_000,minutes:15});
    await rejectEngine.releaseObservationWaits(Date.now());
    if(mode==='LIVE')assert.equal(rejected.some(r=>r.status==='open'),false);
    if(mode==='SIMULATION')assert.equal(rejected.length,1);
  }
});

test('a Galactic child keeps crash state, a failed save keeps the unsaved wait, and a longer timer blocks an in-flight release',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const {originalSettings}=await import('../src/config.mjs');
  const settings={...originalSettings(),mode:'SIMULATION',systemName:'SAGITTARIUS',engineActive:true,galacticExplosionEnabled:true,scarletNeedleEnabled:true,scarletNeedleObservationMinutes:15,scarletNeedleMinCrashCents:7,scarletNeedleMinReboundCents:5,scarletNeedleMinUpwardTicks:3,scarletNeedleMinEntryCents:80,scarletNeedleMaxEntryCents:88,scarletNeedleStakeCents:100,momentumHunterEnabled:true,momentumHunterObservationMinutes:60,momentumStakeCents:100};
  const watches=new Map();
  const stored={rows:[{value:{}}]};
  let failWrite=false;
  const engine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>row,openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async(sql,args)=>{if(String(sql).includes('insert')&&failWrite)throw new Error('write down');if(args)stored.rows=[{value:args[0]}];return {rows:stored.rows};}}},kalshi:{},market:{getQuote:()=>({ticker:'T',yesBid:83,yesAsk:84,status:'active'})},learning:{},getSettings:()=>settings,getLiveReady:()=>true,getCurrentCrashWatch:(c,id,ep)=>watches.get(`${c}|${id}|${ep}`)||null,registerObservationWatch:(c,row)=>watches.set(`${c}|${row.authorizationId}|${row.crashEpisodeId}`,{...watches.get(`${c}|${row.authorizationId}|${row.crashEpisodeId}`),...row})});
  await engine.restoreObservationWaits();
  await engine.armObservationWait({concept:'Scarlet Needle',ticker:'T',authorizationId:'CHILD',crashEpisodeId:'EP1',parentAuthorizationId:'PARENT',armedAtMs:Date.now()-16*60_000,minutes:15,preCrashPeakCents:94,troughCents:80,crashDepthCents:14,reboundCents:6,upwardTicks:4,lastBidCents:83});
  const child=watches.get('Scarlet Needle|CHILD|EP1');
  assert.equal(child.parentAuthorizationId,'PARENT');
  assert.equal(child.crashDepthCents,14);
  assert.equal(child.upwardTicks,4);
  failWrite=true;
  await engine.armObservationWait({concept:'Wave Surfer',ticker:'T',authorizationId:'W',crashEpisodeId:'EP2',armedAtMs:7,minutes:15,preCrashPeakCents:90,troughCents:70,crashDepthCents:20,reboundCents:5,upwardTicks:4,lastBidCents:80});
  failWrite=false;
  stored.rows=[{value:{}}];
  await engine.restoreObservationWaits();
  assert.equal(engine.observationWaits.get('Wave Surfer|T|EP2').armedAtMs,7);
  settings.momentumHunterObservationMinutes=90;
  engine.observationReleaseAttempt={key:'Momentum Hunter|T|EP9',attemptId:'old',armedAtMs:Date.now()-61*60_000};
  const opened=await engine.createHunter('Momentum Hunter',{ticker:'T',yesBid:83,yesAsk:84,status:'active'},100,0,{ci1SourceSnapshot:{authorizationId:'M',crashEpisodeId:'EP9',preCrashPeakCents:94,troughCents:76,crashDepthCents:18,reboundCents:6,upwardTicks:4}});
  assert.equal(opened,null);
  const {ProfitGuard}=await import('../src/profitGuard.mjs');
  const rows=new Map();
  const entry={id:'e1',conceptName:'Momentum Hunter',ticker:'T',status:'open',mode:'SIMULATION',entryPriceCents:84,currentPriceCents:84,peakPriceCents:92,count:1,remainingCount:1,entryFeeCents:2,stopLossCents:10,systemName:'SAGITTARIUS',entryConfig:{infinityBreak:{enabledAtEntry:true,minimumNetPerOriginalContractCents:1,requiredFreshConfirmations:0,maximumBookAgeMs:10000,confirmationWindowMs:10000,fullPositionOnly:true}}};
  rows.set(entry.id,entry);
  const db={async updateEntry(id,patch){Object.assign(rows.get(id),patch);},async entryById(id){return rows.get(id);},async openEntriesByTicker(){return [...rows.values()];},async audit(){}};
  const market={getQuote:()=>({ticker:'T',yesBid:92,yesAsk:93,status:'active',updatedAtMs:Date.now()}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:92,count:5}]}),executableBid:()=>({full:true,filled:1,avgCents:92,bestCents:92,lowestConsumedCents:92}),ensureFreshBook:async()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:92,count:5}]})};
  const guard=new ProfitGuard({db,kalshi:{},market,learning:{},getSettings:()=>({mode:'SIMULATION',simFeeCents:2,systemName:'SAGITTARIUS'})});
  const out=await guard.simulationExit(entry,{action:'infinity_break',reason:'infinity_break',infinityBreak:'IB',peakPriceCents:92,stopPriceCents:1},market.getQuote());
  assert.equal(out.closed,true);
  assert.equal(rows.get('e1').closeReason,'infinity_break');
  assert.equal(rows.get('e1').remainingCount,0);
});

test('a Galactic child from the real grant waits, then opens, and a partial or ambiguous broker result does not invent a full fill',async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const {originalSettings}=await import('../src/config.mjs');
  const {ProfitGuard}=await import('../src/profitGuard.mjs');
  const settings={...originalSettings(),mode:'SIMULATION',systemName:'SAGITTARIUS',engineActive:true,galacticExplosionEnabled:true,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,minGameMinutes:0,maxGameMinutes:0,scarletNeedleEnabled:true,scarletNeedleObservationMinutes:15,scarletNeedleMinCrashCents:7,scarletNeedleMinReboundCents:5,scarletNeedleMinUpwardTicks:3,scarletNeedleMinEntryCents:80,scarletNeedleMaxEntryCents:88,scarletNeedleStakeCents:100};
  const opened=[]; const watches=new Map();
  const engine=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>{opened.push(row);return {...row,id:'child-1'};},updateEntry:async()=>{},openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})}},kalshi:{buildClientOrderId:()=>'c1',placeOrder:async()=>({orderId:'o1',fillCount:1,averageFillPriceCents:84,feePaidCents:2})},market:{getQuote:()=>({ticker:'T',eventTicker:'T',yesBid:83,yesAsk:84,status:'active',updatedAtMs:Date.now()}),refreshTicker:async()=>({quote:{ticker:'T',yesBid:83,yesAsk:84,status:'active'}}),refreshTickerVerified:async()=>({quote:{ticker:'T',yesBid:83,yesAsk:84,status:'active'},marketFresh:true,bookFresh:true}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:83,count:100}]}),executableAsk:()=>({filled:1,full:true,avgCents:84}),executableBid:()=>({filled:1,full:true,avgCents:83}),quoteAgeMs:()=>0,bookAgeMs:()=>0},learning:{},getSettings:()=>settings,getLiveReady:()=>true,getCurrentCrashWatch:(c,id,ep)=>watches.get(`${c}|${id}|${ep}`)||null,registerObservationWatch:(c,row)=>watches.set(`${c}|${row.authorizationId}|${row.crashEpisodeId}`,row)});
  engine.recordEntryPipeline=()=>{};
  await engine.grantGalacticSaintsAfterAthenaOpen({ticker:'T',eventTicker:'T',yesBid:83,yesAsk:84,status:'active'},{id:'bolt',features:{crashDepthCents:14,reboundCents:7,upwardTicks:4}},{id:'parent-1',conceptName:'Momentum Hunter',ticker:'T',sourceTradeId:'EP1'},{watch:{authorizationId:'PARENT',crashEpisodeId:'EP1',preCrashPeakCents:94,troughCents:76,crashDepthCents:14,reboundCents:7,upwardTicks:4}});
  assert.equal(opened.length,0);
  const child=[...watches.values()].find(w=>w.concept==='Scarlet Needle');
  assert.equal(child.parentAuthorizationId,'PARENT');
  assert.equal(child.crashDepthCents,14);
  for(const [key,row] of engine.observationWaits)engine.observationWaits.set(key,{...row,armedAtMs:Date.now()-16*60_000});
  await engine.releaseObservationWaits(Date.now());
  assert.equal(opened.some(r=>r.conceptName==='Scarlet Needle'),true);
  const live={...originalSettings(),mode:'LIVE',systemName:'SAGITTARIUS',engineActive:true,liveArmed:true,momentumHunterEnabled:true,momentumHunterObservationMinutes:0,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:500,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,minGameMinutes:0,maxGameMinutes:0};
  const watch={authorizationId:'A',crashEpisodeId:'EP1',ticker:'T',eventTicker:'T',preCrashPeakCents:94,troughCents:76,crashDepthCents:18,reboundCents:6,upwardTicks:4,lastBidCents:83};
  const quote={ticker:'T',eventTicker:'T',yesBid:83,yesAsk:84,status:'active',updatedAtMs:Date.now()};
  const updates=[];
  const partial=new StrategyEngine({db:{audit:async()=>{},entries:async()=>[],insertEntry:async(row)=>row,updateEntry:async(id,patch)=>updates.push(patch),openEntriesByTicker:async()=>[],openHunterEntriesByTicker:async()=>[],entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})},acquireHunterTickerLock:async()=>async()=>{}},kalshi:{buildClientOrderId:()=>'c1',placeOrder:async()=>({orderId:'o1',fillCount:2,averageFillPriceCents:84,feePaidCents:4})},market:{getQuote:()=>quote,refreshTicker:async()=>({quote}),refreshTickerVerified:async()=>({quote,marketFresh:true,bookFresh:true}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:83,count:100}]}),executableAsk:()=>({filled:5,full:true,avgCents:84}),executableBid:()=>({filled:5,full:true,avgCents:83}),quoteAgeMs:()=>0,bookAgeMs:()=>0},learning:{},getSettings:()=>live,getLiveReady:()=>true,getCurrentCrashWatch:()=>watch});
  partial.recordEntryPipeline=()=>{};
  const filled=await partial.executeIndependentCi1Attack('Momentum Hunter',quote,watch);
  assert.equal(filled.count,2);
  assert.equal(filled.entryFeeCents,4);
  const pending=[{id:'p1',ticker:'T',conceptName:'Momentum Hunter',status:'entry_pending',entryClientOrderId:'c1',sourceTradeId:'EP1'}];
  let orders=0;
  const again=new StrategyEngine({db:{audit:async()=>{},entries:async()=>pending,insertEntry:async(row)=>row,updateEntry:async()=>{},openEntriesByTicker:async()=>pending,openHunterEntriesByTicker:async()=>pending,entryByConceptSourceTradeId:async()=>null,pool:{query:async()=>({rows:[]})},acquireHunterTickerLock:async()=>async()=>{}},kalshi:{buildClientOrderId:()=>'c2',placeOrder:async()=>{orders+=1;return {ambiguous:true};}},market:partial.market,learning:{},getSettings:()=>live,getLiveReady:()=>true,getCurrentCrashWatch:()=>watch});
  again.recordEntryPipeline=()=>{};
  assert.equal(await again.executeIndependentCi1Attack('Momentum Hunter',quote,watch),null);
  assert.equal(orders,0);
  const rows=new Map();
  const entry={id:'e1',conceptName:'Momentum Hunter',ticker:'T',status:'open',mode:'SIMULATION',entryPriceCents:84,currentPriceCents:84,peakPriceCents:92,count:2,remainingCount:2,entryFeeCents:4,stopLossCents:10,systemName:'SAGITTARIUS',entryConfig:{infinityBreak:{enabledAtEntry:true,minimumNetPerOriginalContractCents:1,requiredFreshConfirmations:0,maximumBookAgeMs:10000,confirmationWindowMs:10000,fullPositionOnly:true}}};
  rows.set(entry.id,entry);
  const guard=new ProfitGuard({db:{async updateEntry(id,patch){Object.assign(rows.get(id),patch);},async entryById(id){return rows.get(id);},async openEntriesByTicker(){return [...rows.values()];},async audit(){}},kalshi:{},market:{getQuote:()=>({ticker:'T',yesBid:92,yesAsk:93,status:'active',updatedAtMs:Date.now()}),getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:92,count:5}]}),executableBid:()=>({full:true,filled:2,avgCents:92,bestCents:92,lowestConsumedCents:92}),ensureFreshBook:async()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:92,count:5}]})},learning:{},getSettings:()=>({mode:'SIMULATION',simFeeCents:2,systemName:'SAGITTARIUS'})});
  const out=await guard.simulationExit(entry,{action:'infinity_break',reason:'infinity_break',infinityBreak:'IB',peakPriceCents:92,stopPriceCents:1}, {ticker:'T',yesBid:92});
  assert.equal(out.closed,true);
  assert.equal(rows.get('e1').remainingCount,0);
});


// R11 deterministic restart / LIVE ledger reconciliation regressions.
{
const { KalshiClient } = await import('../src/kalshi.mjs');
const { ProfitGuard, profitGuardDecision } = await import('../src/profitGuard.mjs');
const { AURORA_EXECUTION, ATHENA_EXIT_INTELLIGENCE, freezingCoffinSnapshot } = await import('../src/doctrine.mjs');

const old=()=>Date.now()-40_000;
const base=()=>({
  id:'r11-hunter',ticker:'R11-T',eventTicker:'R11-E',conceptName:'Momentum Hunter',systemName:'SAGITTARIUS',ownerId:'owner',
  mode:'LIVE',status:'open',entryPriceCents:80,currentPriceCents:80,peakPriceCents:80,stopPriceCents:60,stopLossCents:20,
  count:5,remainingCount:5,pnlCents:0,entryFeeCents:10,exitFeeCents:0,exitFilledCount:0,exitNotionalCents:0,
  entryClientOrderId:'buy-1',entryOrderId:null,exitClientOrderId:null,exitOrderId:null,exitExecutionState:{},
  entryConfig:{},openedAtMs:old(),updatedAtMs:old(),stopGuardState:{},profitGuardState:{},apexProfitGuardState:{},
});
function h(rowOverride={},kalshiOverride={},marketOverride={}){
  const row={...base(),...structuredClone(rowOverride)};
  const events=[];const rows=new Map([[row.id,row]]);let placed=0;
  const db={
    async updateEntry(id,patch){Object.assign(rows.get(id),structuredClone(patch));},
    async entryById(id){return structuredClone(rows.get(id));},
    async openEntriesByTicker(){return [...rows.values()].map(r=>structuredClone(r));},
    async audit(_level,event,data){events.push({event,data});},
  };
  const quote={ticker:'R11-T',yesBid:90,yesAsk:91,status:'active',result:'',updatedAtMs:Date.now(),bookInvalid:false};
  const market={getQuote:()=>quote,quoteAgeMs:()=>0,bookAgeMs:()=>0,refreshTicker:async()=>quote,getBook:()=>({updatedAtMs:Date.now()}),ensureFreshBook:async()=>({updatedAtMs:Date.now()}),
    executableBid:(_ticker,count)=>({full:true,filled:count,avgCents:quote.yesBid,bestCents:quote.yesBid,lowestConsumedCents:quote.yesBid}),...marketOverride};
  const kalshi={buildClientOrderId:()=>`sell-${++placed}`,getPositions:async()=>[{ticker:'R11-T',position_fp:rows.get(row.id).remainingCount}],
    inspectOrderByClientId:async()=>({found:false,authoritative:false,order:null}),
    placeOrder:async(o)=>({orderId:`order-${placed}`,status:'executed',fillCount:o.count,averageFillPriceCents:90,feePaidCents:2*o.count}),...kalshiOverride};
  const settings={systemName:'SAGITTARIUS',ownerId:'owner',mode:'LIVE',simFeeCents:2,auroraDamageControlPercent:45};
  const guard=new ProfitGuard({db,kalshi,market,learning:{},getSettings:()=>settings});
  return {row:()=>structuredClone(rows.get(row.id)),db,guard,kalshi,events,placed:()=>placed};
}

function kalshiWith(request){
  const k=Object.create(KalshiClient.prototype);k.request=request;k.fillTruth=async()=>({authoritative:true,count:2,averageFillPriceCents:90,feeCostCents:0});return k;
}

test('R11 audit 1: client order inspection consumes later pages, not just the first 100 orders',async()=>{
  let calls=0;
  const k=kalshiWith(async(_method,path)=>{
    calls++;
    if(path.includes('cursor=next'))return{ok:true,data:{orders:[{order_id:'O-2',client_order_id:'CID',status:'executed',fill_count:2,average_fill_price:'0.9000'}],cursor:''}};
    return{ok:true,data:{orders:[{order_id:'OTHER',client_order_id:'OTHER'}],cursor:'next'}};
  });
  const out=await k.inspectOrderByClientId('R11-T','CID',1000,1);
  assert.equal(out.found,true);assert.equal(out.order.orderId,'O-2');assert.equal(calls,2);
});

test('R11 audit 1: truncated listing is never authoritative evidence of order absence',async()=>{
  const k=kalshiWith(async(_method,path)=>path.includes('cursor=broken')?{ok:false,data:{}}:{ok:true,data:{orders:[],cursor:'broken'}});
  const out=await k.inspectOrderByClientId('R11-T','CID',1000,1);
  assert.equal(out.authoritative,false);assert.equal(out.found,false);
});

test('R11 audit 1: direct broker order ID lookup rejects mismatched client ID',async()=>{
  const k=kalshiWith(async()=>({ok:true,data:{order:{order_id:'BROKER-1',client_order_id:'CID-OTHER',status:'executed',fill_count:2}}}));
  assert.equal((await k.inspectOrderById('BROKER-1','CID-EXPECTED')).mismatch,true);
  assert.equal((await k.inspectOrderById('BROKER-1','CID-OTHER')).order.orderId,'BROKER-1');
});

test('R12 audit 1: negative broker listing preserves uncertain pre-submit durable intent',async()=>{
  const c=h({status:'entry_pending',entryClientOrderId:'BUY-NEVER',updatedAtMs:old()},{inspectOrderByClientId:async()=>({found:false,authoritative:true,order:null})});
  const res=await c.guard.reconcilePending(c.row());
  assert.equal(res.status,'entry_pending');assert.equal(c.row().remainingCount,5);
  assert.equal(c.row().entryClientOrderId,'BUY-NEVER');
  assert.equal(c.events.some(e=>e.event==='entry_pending_order_absence_unproven'),true);
});

test('R11 audit 1: restart after acceptance reconciles exact order ID and does not invent unfilled contracts',async()=>{
  const c=h({status:'entry_pending',entryOrderId:'BROKER-BUY-1',entryClientOrderId:'BUY-1',count:5,remainingCount:5},
    {inspectOrderById:async(id,cid)=>{assert.equal(id,'BROKER-BUY-1');assert.equal(cid,'BUY-1');return{found:true,authoritative:true,order:{orderId:id,status:'canceled',fillCount:2,averageFillPriceCents:84,feePaidCents:4}};},
     inspectOrderByClientId:async()=>{throw new Error('direct lookup should take priority');}});
  const res=await c.guard.reconcilePending(c.row());
  assert.equal(res.status,'open');assert.equal(res.count,2);assert.equal(res.remainingCount,2);assert.equal(res.entryFeeCents,4);
});

test('R11 audit 1: accepted broker order ID cannot be discarded due to a negative paginated lookup',async()=>{
  const c=h({status:'entry_pending',entryOrderId:'ORDER-UNKNOWN',updatedAtMs:old()},
    {inspectOrderById:async()=>({found:false,authoritative:false,order:null}),inspectOrderByClientId:async()=>({found:false,authoritative:true,order:null})});
  const res=await c.guard.reconcilePending(c.row());
  assert.equal(res.status,'entry_pending');assert.equal(c.row().remainingCount,5);
});

test('R11 audit 1: restart after partial SELL uses cumulative deltas exactly once across repeated restarts',async()=>{
  let truth={orderId:'SELL-ID',status:'resting',fillCount:2,averageFillPriceCents:90,feePaidCents:4};
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'SELL-CID',exitOrderId:'SELL-ID'},
    {inspectOrderById:async()=>({found:true,authoritative:true,order:structuredClone(truth)}),inspectOrderByClientId:async()=>{throw new Error('unexpected client scan');}});
  const decision={action:'committed_exit',reason:'hard_stop_loss',peakPriceCents:80,stopPriceCents:60};
  let out=await c.guard.reconcileExistingExitIntent(c.row(),decision);
  assert.equal(out.filled,2);assert.equal(out.ambiguous,true);
  assert.equal(c.row().remainingCount,3);assert.equal(c.row().exitClientOrderId,'SELL-CID');assert.equal(c.row().exitFeeCents,4);
  const restarted=new ProfitGuard({db:c.db,kalshi:c.kalshi,market:c.guard.market,learning:{},getSettings:()=>({ownerId:'owner',systemName:'SAGITTARIUS',simFeeCents:2})});
  out=await restarted.reconcileExistingExitIntent(c.row(),decision);
  assert.equal(out.filled,undefined);assert.equal(c.row().remainingCount,3);assert.equal(c.row().exitFeeCents,4);
  truth={...truth,status:'canceled',fillCount:3,averageFillPriceCents:90,feePaidCents:6};
  out=await restarted.reconcileExistingExitIntent(c.row(),decision);
  assert.equal(out.filled,1);assert.equal(c.row().remainingCount,2);assert.equal(c.row().exitFeeCents,6);
  assert.equal(c.row().exitClientOrderId,null);assert.equal(c.row().exitExecutionState.appliedFillCount,3);
  assert.equal(c.row().exitFilledCount,3);assert.equal(c.row().pnlCents,3*(90-80)-3*2-6);
});

test('R11 audit 1: after broker acceptance without fills, restart blocks another SELL',async()=>{
  let places=0;
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'SELL-PENDING',exitOrderId:'ORDER-PENDING'},
    {inspectOrderById:async()=>({found:true,authoritative:true,order:{orderId:'ORDER-PENDING',status:'resting',fillCount:0}}),placeOrder:async()=>{places++;return{};}});
  const out=await c.guard.liveExit(c.row(),{action:'committed_exit',reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(places,0);assert.equal(c.row().exitClientOrderId,'SELL-PENDING');
});

test('R11 audit 1: a broker cumulative regression fails closed rather than crediting a second fill',async()=>{
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'CID',exitExecutionState:{clientOrderId:'CID',appliedFillCount:3,appliedFeeCents:6,appliedNotionalCents:270}});
  const out=await c.guard.applyBrokerExitTruth(c.row(),{reason:'hard_stop_loss'}, {orderId:'OID',status:'executed',fillCount:2,averageFillPriceCents:90,feePaidCents:4});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.events.some(x=>x.event==='live_exit_broker_cumulative_fill_conflict'),true);
});

test('R11 audit 1: failure to persist durable exit receipt sends no broker order',async()=>{
  let calls=0;
  const c=h({}, {placeOrder:async()=>{calls++;return{};}});
  c.db.updateEntry=async()=>{throw new Error('database unavailable');};
  await assert.rejects(c.guard.liveExit(c.row(),{action:'hard_stop',reason:'hard_stop_loss',peakPriceCents:80,stopPriceCents:60}),/database unavailable/);
  assert.equal(calls,0);
});

test('R11 audit 1: ATHENA-X1 LIVE sell operates only on owned filled quantity',async()=>{
  const c=h({count:2,remainingCount:2,entryFeeCents:4,entryConfig:{profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,athenaExit:{version:ATHENA_EXIT_INTELLIGENCE.version}}});
  const out=await c.guard.liveExit(c.row(),{action:'athena_x1_exit',reason:'athena_x1_exit',peakPriceCents:91,stopPriceCents:60});
  assert.equal(out.closed,true);assert.equal(c.row().remainingCount,0);assert.equal(c.row().exitFilledCount,2);
  assert.equal(c.row().closeReason,'athena_x1_exit');
});

test('R11 audit 1: LIVE Aurora loss execution closes only the real position',async()=>{
  const c=h({count:2,remainingCount:2,entryFeeCents:4,stopPriceCents:63,stopLossCents:17,
    entryConfig:{aurora:{version:AURORA_EXECUTION.version,frozen:true,dangerPriceCents:63,stopDistanceCents:17}}});
  const out=await c.guard.liveExit(c.row(),{action:'hard_stop',reason:'hard_stop_loss',peakPriceCents:80,stopPriceCents:63});
  assert.equal(out.closed,true);assert.equal(c.row().exitFilledCount,2);assert.equal(c.row().remainingCount,0);
});

test('R11 audit 1: Freezing Coffin triggers LIVE liquidation at frozen limit without changing Aurora authority',async()=>{
  const snap=freezingCoffinSnapshot({entryPriceCents:80,maxDropCents:3});
  const entry={...base(),entryPriceCents:80,stopLossCents:45,entryConfig:{aurora:{version:AURORA_EXECUTION.version,frozen:true,stopDistanceCents:45,dangerPriceCents:35},freezingCoffin:snap}};
  const settings={mode:'LIVE',simFeeCents:2};
  assert.equal(profitGuardDecision(entry,{yesBid:78,yesAsk:79,status:'active'},settings).action,'hold');
  const exits=[];
  const c=h(entry,{}, {getQuote:()=>({ticker:entry.ticker,yesBid:77,yesAsk:78,updatedAtMs:Date.now(),status:'active'}),executableBid:()=>({filled:5,full:true,avgCents:77})});
  c.guard.liveExit=async(_entry,decision)=>{exits.push(decision);return{closed:true};};
  const out=await c.guard.handleUltimateStopGuard(entry,{ticker:entry.ticker,yesBid:77,yesAsk:78,updatedAtMs:Date.now(),status:'active'},settings,{action:'hard_stop'});
  assert.equal(out.handled,true);assert.equal(exits.length,1);assert.equal(exits[0].guardState,'FREEZING_COFFIN_EXIT');
  assert.equal(exits[0].liveExitPriceCents,77);
});

test('R11 audit 1: settlement reconciles only the remaining contracts and fees after broker partial exit',async()=>{
  const c=h({count:5,remainingCount:2,entryFeeCents:10,exitFilledCount:3,exitNotionalCents:270,exitFeeCents:6,pnlCents:18,status:'exit_pending'});
  const out=await c.guard.closeAtSettlement(c.row(),{action:'settlement',reason:'settlement',exitPriceCents:100});
  assert.equal(out.closed,true);assert.equal(c.row().remainingCount,0);assert.equal(c.row().exitFilledCount,5);
  assert.equal(c.row().exitFeeCents,6);assert.equal(c.row().pnlCents,18+(100-80)*2-4);
});


test('R11 audit 2: changing broker fees with identical cumulative fills cannot silently rewrite accounted economics',async()=>{
  const c=h({status:'exit_pending',exitClientOrderId:'EXIT',exitOrderId:'ORDER',remainingCount:3,pnlCents:16,exitFeeCents:4,exitFilledCount:2,
    exitExecutionState:{clientOrderId:'EXIT',orderId:'ORDER',appliedFillCount:2,appliedFeeCents:4,appliedNotionalCents:180}});
  const out=await c.guard.applyBrokerExitTruth(c.row(),{reason:'hard_stop_loss'},
    {orderId:'ORDER',status:'executed',fillCount:2,averageFillPriceCents:90,feePaidCents:5});
  assert.equal(out.ambiguous,true);assert.equal(c.row().pnlCents,16);assert.equal(c.row().exitFeeCents,4);
  assert.equal(c.events.some(e=>e.event==='live_exit_broker_cumulative_economic_revision'),true);
});

test('R11 audit 2: broker order ID mismatches keep existing receipt and prohibit a second fill',async()=>{
  const c=h({status:'exit_pending',exitClientOrderId:'EXIT',exitOrderId:'ORDER-OLD',
    exitExecutionState:{clientOrderId:'EXIT',orderId:'ORDER-OLD',appliedFillCount:1,appliedFeeCents:2,appliedNotionalCents:90}});
  const out=await c.guard.applyBrokerExitTruth(c.row(),{reason:'hard_stop_loss'},
    {orderId:'ORDER-OTHER',status:'executed',fillCount:2,averageFillPriceCents:90,feePaidCents:4});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
});

test('R11 audit 2: settlement refuses to close a LIVE position while a SELL order remains unresolved',async()=>{
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'CID',exitOrderId:'OID'},
    {inspectOrderById:async()=>({found:false,authoritative:false,order:null})});
  const out=await c.guard.closeAtSettlement(c.row(),{action:'settlement',reason:'settlement',exitPriceCents:100});
  assert.equal(out.closed,false);assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
});

test('R11 audit 2: non-terminal partial BUY stays pending with only actual contracts, then terminal fill becomes OPEN',async()=>{
  let truth={orderId:'BUY-1',status:'resting',fillCount:2,averageFillPriceCents:84,feePaidCents:4};
  const c=h({status:'entry_pending',entryOrderId:'BUY-1',count:5,remainingCount:5},
    {inspectOrderById:async()=>({found:true,authoritative:true,order:structuredClone(truth)})});
  let res=await c.guard.reconcilePending(c.row());
  assert.equal(res.status,'entry_pending');assert.equal(res.count,2);assert.equal(res.remainingCount,2);
  truth={...truth,status:'canceled',fillCount:3,feePaidCents:6};
  res=await c.guard.reconcilePending(c.row());
  assert.equal(res.status,'open');assert.equal(res.count,3);assert.equal(res.remainingCount,3);
});

test('R11 audit 2: broker fill without an authoritative price cannot create realized P&L',async()=>{
  const c=h({status:'exit_pending',exitClientOrderId:'CID'});
  const out=await c.guard.applyBrokerExitTruth(c.row(),{reason:'hard_stop_loss'},
    {orderId:'O',status:'executed',fillCount:2,averageFillPriceCents:null,feePaidCents:4});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.events.some(e=>e.event==='live_exit_broker_fill_price_unavailable'),true);
});

test('R11 audit 2: client cursor cycles never create false authoritative order absence',async()=>{
  const k=kalshiWith(async()=>({ok:true,data:{orders:[],cursor:'LOOP'}}));
  const out=await k.inspectOrderByClientId('R11-T','CID',1000,1);
  assert.equal(out.authoritative,false);
});

test('R11 audit 2: dedicated exit execution receipt column is stored with position and accepted in updates',async()=>{
  const { Database }=await import('../src/db.mjs');
  const d=Object.create(Database.prototype),queries=[];
  d.pool={query:async(sql,vals)=>{queries.push({sql,vals});return{rows:[]};}};
  const row={...base(),exitExecutionState:{version:'R11-EXIT-EXECUTION-RECEIPT',clientOrderId:'CID',appliedFillCount:2}};
  await d.insertEntry(row);
  assert.match(queries[0].sql,/exit_execution_state/);
  assert.deepEqual(queries[0].vals.at(-1),row.exitExecutionState);
  await d.updateEntry(row.id,{exitExecutionState:{...row.exitExecutionState,appliedFillCount:3}});
  assert.match(queries[1].sql,/exit_execution_state=/);
  assert.equal(queries[1].vals[0].appliedFillCount,3);
});

test('R11 audit 2: restart exit reconciliation rejects a different returned broker order ID',async()=>{
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'CID',exitOrderId:'ORIGINAL'},
    {inspectOrderById:async()=>({found:false,authoritative:false,order:null}),
     inspectOrderByClientId:async()=>({found:true,authoritative:true,order:{orderId:'DIFFERENT',status:'executed',fillCount:2,averageFillPriceCents:90,feePaidCents:4}})});
  const out=await c.guard.reconcileExistingExitIntent(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
});


test('R11 audit 2: real Freezing Coffin path invokes LIVE broker SELL and closes exact filled quantity',async()=>{
  let sell=null;
  const coffin=freezingCoffinSnapshot({entryPriceCents:80,maxDropCents:3});
  const c=h({entryConfig:{aurora:{version:AURORA_EXECUTION.version,frozen:true,stopDistanceCents:45,dangerPriceCents:35},freezingCoffin:coffin}},
    {placeOrder:async(o)=>{sell=o;return{orderId:'FC-SELL',status:'executed',fillCount:o.count,averageFillPriceCents:77,feePaidCents:2*o.count};}},
    {getQuote:()=>({ticker:'R11-T',yesBid:77,yesAsk:78,status:'active',updatedAtMs:Date.now(),bookInvalid:false}),
     executableBid:(_t,count)=>({filled:count,full:true,avgCents:77,bestCents:77,lowestConsumedCents:77})});
  const result=await c.guard.protect(c.row());
  assert.equal(result.closed,true);assert.equal(sell.action,'sell');assert.equal(sell.count,5);
  assert.equal(c.row().remainingCount,0);assert.equal(c.row().exitFilledCount,5);
  assert.equal(c.row().closeReason,'hard_stop_loss');
});

test('R11 audit 2: after ambiguous SELL accepted with known broker ID, restart closes exact owned quantity',async()=>{
  let sells=0;
  const c=h({status:'exit_pending',exitClientOrderId:'CID-ACCEPTED',exitOrderId:'OID-ACCEPTED',closeReason:'athena_x1_exit',
    entryConfig:{profitAuthority:ATHENA_EXIT_INTELLIGENCE.version}},
    {inspectOrderById:async(id,client)=>{assert.equal(id,'OID-ACCEPTED');assert.equal(client,'CID-ACCEPTED');
       return{found:true,authoritative:true,order:{orderId:id,status:'executed',fillCount:5,averageFillPriceCents:90,feePaidCents:10}};},
     placeOrder:async()=>{sells++;throw new Error('duplicate sell');}});
  const restarted=new ProfitGuard({db:c.db,kalshi:c.kalshi,market:c.guard.market,learning:{},
    getSettings:()=>({ownerId:'owner',systemName:'SAGITTARIUS',mode:'LIVE',simFeeCents:2})});
  const result=await restarted.liveExit(c.row(),{action:'committed_exit',reason:'athena_x1_exit'});
  assert.equal(result.closed,true);assert.equal(c.row().remainingCount,0);assert.equal(sells,0);
});

test('R11 audit 2: full settlement route takes broker-confirmed prior partial fill into account',async()=>{
  const c=h({status:'exit_pending',closeReason:'hard_stop_loss',exitClientOrderId:'CID-FINAL',exitOrderId:'OID-FINAL'},
    {inspectOrderById:async()=>({found:true,authoritative:true,order:{orderId:'OID-FINAL',status:'canceled',fillCount:2,averageFillPriceCents:90,feePaidCents:4}})},
    {getQuote:()=>({ticker:'R11-T',status:'finalized',result:'yes',yesBid:100,yesAsk:100,updatedAtMs:Date.now()}),refreshTicker:async()=>({ticker:'R11-T',status:'finalized',result:'yes',yesBid:100,yesAsk:100,updatedAtMs:Date.now()})});
  const out=await c.guard.protect(c.row());
  assert.equal(out.closed,true);assert.equal(c.row().remainingCount,0);assert.equal(c.row().exitFilledCount,5);
  assert.equal(c.row().exitFeeCents,4);assert.equal(c.row().closeReason,'settlement_win');
});


// R12 double-audit: exercise the actual KalshiClient pagination/verification
// implementation, then feed its evidence into the real ProfitGuard lifecycle.
function r12Broker({summaryCount=5,summaryStatus='executed',pages,summaryFee='0.0200',orderId='BROKER-R12',clientId='SELL-R12'}={}) {
  let reads=0;
  const k=Object.create(KalshiClient.prototype);
  const order={order_id:orderId,client_order_id:clientId,status:summaryStatus,fill_count_fp:summaryCount,
    average_fill_price:'0.9000',average_fee_paid:summaryFee};
  const defaultPages=[{ok:true,data:{fills:Array.from({length:summaryCount},(_,i)=>({fill_id:`F${i}`,order_id:orderId,count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:''}}];
  const history=pages||defaultPages;
  k.request=async(_method,path)=>{
    if(path.startsWith('/portfolio/orders/'))return{ok:true,data:{order}};
    if(path.startsWith('/portfolio/orders?'))return{ok:true,data:{orders:[order],cursor:''}};
    if(path.startsWith('/portfolio/fills?')){
      const idx=reads++;return history[Math.min(idx,history.length-1)];
    }
    throw new Error(`unhandled broker path ${path}`);
  };
  return {k,order,reads:()=>reads};
}
function r12Pending(overrides={},kalshiOverride={},marketOverride={}) {
  return h({status:'exit_pending',exitClientOrderId:'SELL-R12',exitOrderId:'BROKER-R12',closeReason:'hard_stop_loss',
    exitExecutionState:{version:'R11-EXIT-EXECUTION-RECEIPT',clientOrderId:'SELL-R12',orderId:'BROKER-R12',
      appliedFillCount:0,appliedFeeCents:0,appliedNotionalCents:0,terminal:false},...overrides},kalshiOverride,marketOverride);
}

test('R12 A1: complete two-page fill history agrees with broker cumulative count',async()=>{
  const pages=[
    {ok:true,data:{fills:[1,2].map(i=>({fill_id:`P${i}`,order_id:'BROKER-R12',count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:'PAGE-2'}},
    {ok:true,data:{fills:[3,4,5].map(i=>({fill_id:`P${i}`,order_id:'BROKER-R12',count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:''}},
  ];
  const {k}=r12Broker({pages});
  const inspected=await k.inspectOrderById('BROKER-R12','SELL-R12');
  assert.equal(inspected.authoritative,true);assert.equal(inspected.order.fillCount,5);
  assert.equal(inspected.order.feePaidCents,10);assert.equal(inspected.order.averageFillPriceCents,90);
});

test('R12 A1: failed fill-history page cannot reduce an authoritative five-fill order to two',async()=>{
  const {k}=r12Broker({pages:[
    {ok:true,data:{fills:[1,2].map(i=>({fill_id:`P${i}`,count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:'NEXT'}},
    {ok:false,status:503,data:{error:'unavailable'}},
  ]});
  const inspected=await k.inspectOrderById('BROKER-R12','SELL-R12');
  assert.equal(inspected.found,true);assert.equal(inspected.authoritative,false);assert.equal(inspected.order,null);
  assert.equal(inspected.reason,'fill_history_request_failed');
});

test('R12 A1: repeated fill-history cursor fails closed without duplicate count',async()=>{
  const {k}=r12Broker({pages:[{ok:true,data:{fills:[{count_fp:2,yes_price_dollars:'0.90',fee_cost:'0.04'}],cursor:'LOOP'}}]});
  const out=await k.inspectOrderById('BROKER-R12','SELL-R12');
  assert.equal(out.authoritative,false);assert.equal(out.reason,'fill_history_repeated_cursor');
});

test('R12 A1: mismatched broker summary and complete fill records remain unverified',async()=>{
  const {k}=r12Broker({summaryCount:5,pages:[{ok:true,data:{fills:[1,2].map(i=>({fill_id:`P${i}`,count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:''}}]});
  const out=await k.inspectOrderById('BROKER-R12','SELL-R12');
  assert.equal(out.authoritative,false);assert.equal(out.reason,'broker_fill_count_mismatch');
});

test('R12 A1: duplicate fill IDs, wrong order, malformed page, missing fee and conflicting fee all block',async()=>{
  const scenarios=[
    [[{fill_id:'DUP',count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'}, {fill_id:'DUP',count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'}], 'fill_history_duplicate_fill_id',2,'0.0200'],
    [[{fill_id:'OTHER',order_id:'WRONG',count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'}], 'fill_history_wrong_order',1,'0.0200'],
    [[{count_fp:1,yes_price_dollars:'0.90'}], 'broker_fill_fee_unverified',1,null],
    [[{count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'}], 'broker_fill_fee_mismatch',1,'0.0500'],
  ];
  for (const [fills,reason,summaryCount,summaryFee] of scenarios) {
    const {k}=r12Broker({summaryCount,summaryFee,pages:[{ok:true,data:{fills,cursor:''}}]});
    const out=await k.inspectOrderById('BROKER-R12','SELL-R12');
    assert.equal(out.authoritative,false,reason);assert.equal(out.reason,reason);
  }
  const {k}=r12Broker({pages:[{ok:true,data:{cursor:''}}]});
  assert.equal((await k.inspectOrderById('BROKER-R12','SELL-R12')).reason,'fill_history_malformed_page');
});

test('R12 A1: unverified history through client ID and prefix queries never becomes economic truth',async()=>{
  const {k}=r12Broker({pages:[{ok:false,status:503,data:{}}]});
  const a=await k.inspectOrderByClientId('R11-T','SELL-R12',0,1);
  assert.equal(a.found,true);assert.equal(a.authoritative,false);assert.equal(a.order,null);
  const b=await k.inspectOrderHistoryByClientPrefix('R11-T','SELL-',0);
  assert.equal(b.authoritative,false);assert.equal(b.fillCount,0);
});

test('R12 A1: actual incomplete fill history preserves SELL receipt and original position across restart',async()=>{
  let sellCalls=0;
  const {k}=r12Broker({pages:[
    {ok:true,data:{fills:[1,2].map(i=>({count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:'NEXT'}},
    {ok:false,status:500,data:{}},
  ]});
  const c=r12Pending({}, {inspectOrderById:(...args)=>k.inspectOrderById(...args),
    inspectOrderByClientId:(...args)=>k.inspectOrderByClientId(...args),placeOrder:async()=>{sellCalls++;throw Error('duplicate');}});
  const out=await c.guard.liveExit(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.row().exitClientOrderId,'SELL-R12');assert.equal(c.row().exitOrderId,'BROKER-R12');
  assert.equal(c.row().exitFilledCount,0);assert.equal(sellCalls,0);
});

test('R12 A1: broker summary mismatch does not mutate ledger or release pending id',async()=>{
  const {k}=r12Broker({summaryCount:5,pages:[{ok:true,data:{fills:[1,2].map(i=>({count_fp:1,yes_price_dollars:'0.90',fee_cost:'0.02'})),cursor:''}}]});
  const c=r12Pending({}, {inspectOrderById:(...a)=>k.inspectOrderById(...a)});
  const out=await c.guard.reconcileExistingExitIntent(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.row().exitClientOrderId,'SELL-R12');assert.equal(c.row().exitFilledCount,0);
});

test('R12 A2: restart resolves partial 2 then cumulative 5 once, without a duplicate broker SELL',async()=>{
  let count=2,status='resting',sells=0;
  const kalshi={inspectOrderById:async()=>({found:true,authoritative:true,order:{orderId:'BROKER-R12',status,fillCount:count,averageFillPriceCents:90,feePaidCents:2*count}}),
    placeOrder:async()=>{sells++;throw Error('duplicate sell');}};
  const c=r12Pending({},kalshi);
  let result=await c.guard.liveExit(c.row(),{reason:'hard_stop_loss'});
  assert.equal(result.filled,2);assert.equal(c.row().remainingCount,3);
  assert.equal(c.row().exitExecutionState.appliedFillCount,2);assert.equal(c.row().exitClientOrderId,'SELL-R12');
  const revived=new ProfitGuard({db:c.db,kalshi:c.kalshi,market:c.guard.market,learning:{},getSettings:()=>({ownerId:'owner',systemName:'SAGITTARIUS',mode:'LIVE',simFeeCents:2})});
  result=await revived.liveExit(c.row(),{reason:'hard_stop_loss'});
  assert.equal(c.row().remainingCount,3);assert.equal(c.row().exitFilledCount,2);
  count=5;status='executed';
  result=await revived.liveExit(c.row(),{reason:'hard_stop_loss'});
  assert.equal(result.closed,true);assert.equal(c.row().remainingCount,0);
  assert.equal(c.row().exitFilledCount,5);assert.equal(c.row().exitFeeCents,10);
  assert.equal(c.row().exitExecutionState.appliedFillCount,5);
  await revived.liveExit(c.row(),{reason:'hard_stop_loss'});
  assert.equal(c.row().exitFilledCount,5);assert.equal(sells,0);
});

test('R12 A2: prior applied two fills cannot be rolled back by partial broker history',async()=>{
  const previous={version:'R11-EXIT-EXECUTION-RECEIPT',clientOrderId:'SELL-R12',orderId:'BROKER-R12',appliedFillCount:2,appliedFeeCents:4,appliedNotionalCents:180,terminal:false};
  const {k}=r12Broker({summaryCount:5,pages:[{ok:false,status:502,data:{}}]});
  const c=r12Pending({remainingCount:3,exitFilledCount:2,exitFeeCents:4,exitNotionalCents:180,exitExecutionState:previous},
    {inspectOrderById:(...a)=>k.inspectOrderById(...a)});
  const out=await c.guard.reconcileExistingExitIntent(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,3);
  assert.deepEqual(c.row().exitExecutionState,previous);assert.equal(c.row().exitClientOrderId,'SELL-R12');
});

test('R12 A2: negative broker search leaves unresolved SELL receipt; repeated calls never resubmit',async()=>{
  let submits=0;
  const c=r12Pending({exitOrderId:null,updatedAtMs:old()},
    {inspectOrderByClientId:async()=>({found:false,authoritative:true,order:null}),placeOrder:async()=>{submits++;throw Error('duplicate');}});
  for (let i=0;i<3;i++) {
    const out=await c.guard.liveExit(c.row(),{reason:'hard_stop_loss'});
    assert.equal(out.ambiguous,true);
  }
  assert.equal(c.row().exitClientOrderId,'SELL-R12');assert.equal(submits,0);
});

test('R12 A2: terminal no-fill order confirmed by complete history may release receipt',async()=>{
  const {k}=r12Broker({summaryCount:0,summaryStatus:'canceled',pages:[{ok:true,data:{fills:[],cursor:''}}]});
  const c=r12Pending({}, {inspectOrderById:(...args)=>k.inspectOrderById(...args)});
  const out=await c.guard.reconcileExistingExitIntent(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.retryLater,true);assert.equal(c.row().exitClientOrderId,null);
  assert.equal(c.row().remainingCount,5);assert.equal(c.row().exitFilledCount,0);
});



test('R12 A2: order ID lookup refuses an authenticated response for the wrong ticker',async()=>{
  const {k,order}=r12Broker();order.ticker='OTHER-TICKER';
  const inspected=await k.inspectOrderById('BROKER-R12','SELL-R12','R11-T');
  assert.equal(inspected.authoritative,false);assert.equal(inspected.reason,'broker_order_ticker_mismatch');
});

test('R12 A2: direct client listing also rejects wrong-ticker identity even for matching client ID',async()=>{
  const {k,order}=r12Broker();order.ticker='OTHER-TICKER';
  const inspected=await k.inspectOrderByClientId('R11-T','SELL-R12',0,1);
  assert.equal(inspected.authoritative,false);assert.equal(inspected.reason,'broker_order_ticker_mismatch');
});

test('R12 A2: prefix order-history cursor loop or missing matching order ID cannot prove broker fill totals',async()=>{
  const k=Object.create(KalshiClient.prototype);
  k.request=async()=>({ok:true,data:{orders:[{client_order_id:'SELL-X-123',fill_count:2}],cursor:'LOOP'}});
  let inspected=await k.inspectOrderHistoryByClientPrefix('R11-T','SELL-X',0,{maxPages:3});
  assert.equal(inspected.authoritative,false);
  assert.equal(inspected.fillCount,0);
  const q=Object.create(KalshiClient.prototype);
  q.request=async()=>({ok:true,data:{orders:[{client_order_id:'SELL-X-123',fill_count:2}],cursor:''}});
  inspected=await q.inspectOrderHistoryByClientPrefix('R11-T','SELL-X',0,{maxPages:3});
  assert.equal(inspected.authoritative,false);
});

test('R12 A2: unknown GET order is preserved, never replaced by an unrelated accepted client row',async()=>{
  const c=r12Pending({}, {inspectOrderById:async()=>({found:true,authoritative:false,order:null,mismatch:true}),
    inspectOrderByClientId:async()=>({found:true,authoritative:true,order:{orderId:'OTHER',status:'executed',fillCount:5,averageFillPriceCents:90,feePaidCents:10}})});
  const out=await c.guard.reconcileExistingExitIntent(c.row(),{reason:'hard_stop_loss'});
  assert.equal(out.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.row().exitClientOrderId,'SELL-R12');
});

test('R12 A2: a broker-verified terminal partial exit settles only the remaining three contracts',async()=>{
  const c=r12Pending({}, {inspectOrderById:async()=>({found:true,authoritative:true,
    order:{orderId:'BROKER-R12',status:'canceled',fillCount:2,averageFillPriceCents:90,feePaidCents:4}})},
    {getQuote:()=>({ticker:'R11-T',status:'finalized',result:'yes',yesBid:100,yesAsk:100,updatedAtMs:Date.now()}),
     refreshTicker:async()=>({ticker:'R11-T',status:'finalized',result:'yes',yesBid:100,yesAsk:100,updatedAtMs:Date.now()})});
  const out=await c.guard.protect(c.row());
  assert.equal(out.closed,true);assert.equal(c.row().remainingCount,0);
  assert.equal(c.row().exitFilledCount,5);assert.equal(c.row().exitFeeCents,4);
  assert.equal(c.row().exitExecutionState.appliedFillCount,2);
});

test('R12 A2: actual database adapter rejects an UPDATE that affected no persisted entry',async()=>{
  const { Database }=await import('../src/db.mjs');
  const d=Object.create(Database.prototype);
  d.pool={query:async()=>({rowCount:0})};
  await assert.rejects(()=>d.updateEntry('MISSING',{remainingCount:2,exitExecutionState:{appliedFillCount:3}}),/sag_entry_update_missing/);
});

// Explicit disposable PostgreSQL staging gate. In normal unit test mode this
// is skipped, never substituted with an in-memory transactional imitation.
// Set SAGITTARIUS_TEST_DATABASE_URL to an isolated, writable PostgreSQL DB
// and SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1 to deliberately enable it.
test('R12 POSTGRES GATE: durable ledger/receipt commit, interrupted transaction rollback and new-process restart',
  {skip:!(process.env.SAGITTARIUS_TEST_DATABASE_URL && process.env.SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB==='1')},async()=>{
  const {Database}=await import('../src/db.mjs');
  const {randomBytes}=await import('node:crypto');
  const {execFileSync}=await import('node:child_process');
  const {default:pg}=await import('pg');
  const connectionString=process.env.SAGITTARIUS_TEST_DATABASE_URL;
  const config={connectionString,ssl:/localhost|127\.0\.0\.1/.test(connectionString)?false:{rejectUnauthorized:false},max:3};
  const pool=new pg.Pool(config);
  const schema='sag_r12_'+randomBytes(6).toString('hex');
  const table=`"${schema}".sag_entries`;
  const id='TEST-RECEIPT-R12';
  try{
    await pool.query(`create schema "${schema}"`);
    await pool.query(`create table ${table} (id text primary key,status text,remaining_count double precision,
      exit_filled_count double precision,exit_fee_cents double precision,exit_notional_cents double precision,
      pnl_cents double precision,exit_order_id text,exit_client_order_id text,exit_execution_state jsonb not null default '{}'::jsonb)`);
    await pool.query(`insert into ${table}(id,status,remaining_count,exit_filled_count,exit_fee_cents,exit_notional_cents,pnl_cents,exit_client_order_id,exit_order_id,exit_execution_state)
      values($1,'exit_pending',5,0,0,0,0,'CID-R12','OID-R12','{}'::jsonb)`,[id]);
    const db=Object.create(Database.prototype);
    db.pool={query:(sql,vals)=>pool.query(sql.replace('update sag_entries ',`update ${table} `),vals)};
    const receipt={version:'R11-EXIT-EXECUTION-RECEIPT',clientOrderId:'CID-R12',orderId:'OID-R12',appliedFillCount:2,appliedFeeCents:4,appliedNotionalCents:180,terminal:false};
    await db.updateEntry(id,{remainingCount:3,exitFilledCount:2,exitFeeCents:4,exitNotionalCents:180,
      exitClientOrderId:'CID-R12',exitOrderId:'OID-R12',exitExecutionState:receipt});
    let row=(await pool.query(`select * from ${table} where id=$1`,[id])).rows[0];
    assert.equal(Number(row.remaining_count),3);assert.equal(row.exit_execution_state.appliedFillCount,2);
    assert.equal(row.exit_client_order_id,'CID-R12');
    await assert.rejects(()=>db.updateEntry(id,{remainingCount:0,exitExecutionState:{appliedFillCount:5}},
      {clientOrderId:'CID-R12',appliedFillCount:0}),/sag_exit_receipt_concurrent_change/);
    const interrupted=await pool.connect();
    await interrupted.query('begin');
    await interrupted.query(`update ${table} set remaining_count=0,exit_client_order_id=null,exit_execution_state='{"appliedFillCount":5}'::jsonb where id=$1`,[id]);
    interrupted.release(true); // Drops the connection: PostgreSQL must ROLLBACK the uncommitted mutation.
    row=(await pool.query(`select * from ${table} where id=$1`,[id])).rows[0];
    assert.equal(Number(row.remaining_count),3);
    assert.equal(row.exit_client_order_id,'CID-R12');
    assert.equal(row.exit_execution_state.appliedFillCount,2);
    await db.updateEntry(id,{remainingCount:0,exitFilledCount:5,exitFeeCents:10,
      exitClientOrderId:null,exitExecutionState:{...receipt,appliedFillCount:5,appliedFeeCents:10,appliedNotionalCents:450,terminal:true}},
      {clientOrderId:'CID-R12',appliedFillCount:2});
    // A fresh child Node process (not the same pool or runtime) reads the
    // committed receipt, proving recovery material survives process death.
    const childCode=`import pg from 'pg';const p=new pg.Pool({connectionString:process.env.SAGITTARIUS_TEST_DATABASE_URL,ssl:/localhost|127\.0\.0\.1/.test(process.env.SAGITTARIUS_TEST_DATABASE_URL)?false:{rejectUnauthorized:false}});try{const r=await p.query('select remaining_count,exit_filled_count,exit_client_order_id,exit_execution_state from "${schema}".sag_entries where id=$1',['TEST-RECEIPT-R12']);console.log(JSON.stringify(r.rows[0]));}finally{await p.end();}`;
    const observed=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',childCode],
      {encoding:'utf8',cwd:process.cwd(),env:process.env,timeout:30000}));
    assert.equal(Number(observed.remaining_count),0);
    assert.equal(Number(observed.exit_filled_count),5);
    assert.equal(observed.exit_client_order_id,null);
    assert.equal(observed.exit_execution_state.appliedFillCount,5);
  } finally {
    try {await pool.query(`drop schema if exists "${schema}" cascade`);} finally {await pool.end();}
  }
});


test('R12 A2: immediate broker SELL fill stays unbooked until complete independent history is available',async()=>{
  let requests=0;
  const c=h({}, {
    placeOrder:async(o)=>{requests++;return{orderId:'IMMEDIATE-OID',status:'executed',fillCount:Number(o.count),averageFillPriceCents:90,feePaidCents:2*Number(o.count)};},
    inspectOrderById:async()=>({found:true,authoritative:false,order:null,reason:'fill_history_request_failed'}),
  });
  const result=await c.guard.liveExit(c.row(),{action:'committed_exit',reason:'hard_stop_loss'});
  assert.equal(requests,1);assert.equal(result.ambiguous,true);assert.equal(c.row().remainingCount,5);
  assert.equal(c.row().exitFilledCount,0);assert.ok(c.row().exitClientOrderId);
  assert.equal(c.row().exitOrderId,'IMMEDIATE-OID');
});

test('R12 A2: cumulative fill check prevents a second LIVE sell while accepted broker order is still unverified',async()=>{
  let requests=0;
  const c=h({}, {
    placeOrder:async(o)=>{requests++;return{orderId:'IMMEDIATE-OID',status:'executed',fillCount:Number(o.count),averageFillPriceCents:90,feePaidCents:2*Number(o.count)};},
    inspectOrderById:async()=>({found:true,authoritative:false,order:null,reason:'broker_fill_count_mismatch'}),
  });
  await c.guard.liveExit(c.row(),{reason:'hard_stop_loss'});
  for(let i=0;i<3;i++){
    const r=await c.guard.liveExit(c.row(),{reason:'hard_stop_loss'});
    assert.equal(r.ambiguous,true);
  }
  assert.equal(requests,1);assert.equal(c.row().exitFilledCount,0);
  assert.ok(c.row().exitClientOrderId);
});


test('R12 A2: PostgreSQL receipt compare-and-set refuses stale cumulative writers',async()=>{
  const {Database}=await import('../src/db.mjs');
  const queries=[];const d=Object.create(Database.prototype);
  d.pool={query:async(sql,params)=>{queries.push({sql,params});return{rowCount:0};}};
  await assert.rejects(()=>d.updateEntry('ENTRY',{
    remainingCount:3,exitExecutionState:{appliedFillCount:2},exitClientOrderId:'CID',pnlCents:42,
  },{clientOrderId:'CID',appliedFillCount:0}),/sag_exit_receipt_concurrent_change/);
  assert.match(queries[0].sql,/exit_client_order_id=\$\d+.*coalesce\(\(exit_execution_state->>'appliedFillCount'\)::double precision,0\)=\$\d+/);
  assert.equal(queries[0].params.at(-2),'CID');assert.equal(queries[0].params.at(-1),0);
});

test('R12 A2: stale LIVE reconciler cannot roll back a receipt applied by another worker',async()=>{
  const c=r12Pending();
  const update=c.db.updateEntry;
  c.db.updateEntry=async(id,patch,expected)=>{
    if(expected){const fresh=await c.db.entryById(id);
      if(fresh.exitClientOrderId!==expected.clientOrderId || Number(fresh.exitExecutionState?.appliedFillCount||0)!==expected.appliedFillCount)
        throw Error('sag_exit_receipt_concurrent_change');
    }
    return update(id,patch);
  };
  const stale=c.row();
  const first=await c.guard.applyBrokerExitTruth(stale,{reason:'hard_stop_loss'},
    {status:'resting',orderId:'BROKER-R12',fillCount:2,averageFillPriceCents:90,feePaidCents:4});
  assert.equal(first.filled,2);assert.equal(c.row().remainingCount,3);
  const conflicting=await c.guard.applyBrokerExitTruth(stale,{reason:'hard_stop_loss'},
    {status:'executed',orderId:'BROKER-R12',fillCount:5,averageFillPriceCents:90,feePaidCents:10});
  assert.equal(conflicting.ambiguous,true);assert.equal(c.row().remainingCount,3);
  assert.equal(c.row().exitFilledCount,2);assert.equal(c.row().exitClientOrderId,'SELL-R12');
  assert.equal(c.events.some(e=>e.event==='live_exit_receipt_concurrent_change'),true);
  const finished=await c.guard.applyBrokerExitTruth(c.row(),{reason:'hard_stop_loss'},
    {status:'executed',orderId:'BROKER-R12',fillCount:5,averageFillPriceCents:90,feePaidCents:10});
  assert.equal(finished.closed,true);assert.equal(c.row().exitFilledCount,5);
});
}


// R13 read-only entry-choke diagnostics and economic-feasibility regression
{
const {default:test}=await import('node:test');
const {default:assert}=await import('node:assert/strict');
const {AtomicThunderBoltEngine, atomicThunderBoltDecision, atomicThunderBoltFeatures, boltEconomicEntryWindow}=await import('../src/opportunity.mjs');
const {buildLedgerExportPackage}=await import('../src/server.mjs');
const now=Date.now();
const settings={mode:'SIMULATION',maxSpreadCents:3,simFeeCents:2,atomicThunderGreenTriggerCents:1,
  infinityBreakMinNetPerOriginalContractCents:13,momentumHunterEnabled:true,momentumMinEntryCents:80,momentumMaxEntryCents:88,momentumStakeCents:500};
const shadow={id:'shadow-1',ticker:'TEST-YES',conceptName:'Pegasus',status:'open',entryPriceCents:77,openedAtMs:now-10000};
function quote(ask){return{ticker:'TEST-YES',eventTicker:'TEST',yesAsk:ask,yesBid:ask-1,quoteAtMs:now};}
function features(ask,s=settings,cosmos=[shadow]){return atomicThunderBoltFeatures({q:quote(ask),history:[],settings:s,cosmos,now});}

test('R13 economic gate report uses exact existing fee-aware target and does not widen 80-88c',()=>{
  const row=boltEconomicEntryWindow(settings)[0];
  assert.equal(row.operatorMinEntryCents,80);assert.equal(row.operatorMaxEntryCents,88);
  assert.equal(row.feasibleMinEntryCents,80);assert.equal(row.feasibleMaxEntryCents,82);
  assert.deepEqual(row.unreachableEntryPrices,[83,84,85,86,87,88]);
  for(let ask=80;ask<=88;ask++){
    const f=features(ask);
    assert.equal(f.eligibleAttacks[0].requiredTargetBidCents,ask+17);
    assert.equal(f.eligibleAttacks[0].targetFeasible,ask<=82);
    assert.equal(atomicThunderBoltDecision(f,settings).detected,ask<=82);
  }
});

test('R13 LIVE vs SIM reporting follows the real existing fee estimator without changing entry logic',()=>{
  for(const mode of ['SIMULATION','LIVE']){
    const s={...settings,mode};
    const effective=boltEconomicEntryWindow(s)[0];
    for(let ask=80;ask<=88;ask++){
      const actual=features(ask,s).eligibleAttacks[0];
      assert.equal(actual.targetFeasible,!effective.unreachableEntryPrices.includes(ask));
    }
  }
});

test('R13 choke diagnostics counts reasons and unique shadow IDs, with no persistence or trade authorization',()=>{
  const db={upsertOpportunityEpisode:async()=>{throw new Error('should not write')},updateEntry:async()=>{throw new Error('should not write')}};
  const engine=new AtomicThunderBoltEngine({getSettings:()=>settings,db,systemName:'SAGITTARIUS'});
  const f=features(84);
  const d=atomicThunderBoltDecision(f,settings);
  engine.observeChokeDecision(f,d,now);engine.observeChokeDecision(f,d,now+1);
  let t=engine.chokeDiagnosticSummary();
  assert.equal(t.byReason.economic_target_unreachable,2);
  assert.equal(t.distinctShadowReasons.economic_target_unreachable,1);
  assert.equal(t.withGreenShadow,2);
  assert.equal(t.recent.length,1);
  assert.equal(engine.detected,0);
  assert.deepEqual(t.effectiveEconomicEntryWindows[0].unreachableEntryPrices,[83,84,85,86,87,88]);
});

test('R13 choke statistics are bounded even through repeated high-volume quote traffic',()=>{
  const engine=new AtomicThunderBoltEngine({getSettings:()=>settings});
  const f=features(84),d=atomicThunderBoltDecision(f,settings);
  for(let i=0;i<3000;i++){
    const fs={...f,cosmoShadowTrades:[{...shadow,id:`shadow-${i}`,green:true,shadowTradeId:`shadow-${i}`}],greenSources:[{...shadow,id:`shadow-${i}`,green:true,shadowTradeId:`shadow-${i}`}],greenSourceCount:1};
    engine.observeChokeDecision(fs,d,now+i);
  }
  assert.ok(engine.chokeTelemetry.seen.size<=1024);
  assert.ok(engine.chokeDiagnosticSummary().recent.length<=24);
  assert.equal(engine.chokeDiagnosticSummary().byReason.economic_target_unreachable,3000);
});

test('R13 ledger diagnostic summary carries bounded upstream and post-Bolt choke evidence',()=>{
  const evidence={entryAdmission:{byReason:{maximum_game_time_exceeded:5}},candidateFunnel:{byStage:{ATHENA_REJECT:2}},
    entryPipeline:{byReason:{hunter_cooldown:1}},boltFilters:{byReason:{economic_target_unreachable:4}}};
  const out=buildLedgerExportPackage({records:[],meta:{exportId:'ecv1-test',systemName:'SAGITTARIUS',mode:'SIMULATION',snapshotCutoffMs:now,expectedCount:0,entryChokeDiagnostics:evidence}});
  const summary=out.files.find(f=>f.name==='diagnostic-summary.json');
  assert.ok(summary);
  const j=JSON.parse(summary.text);
  assert.deepEqual(j.entryChokeDiagnostics,evidence);
  assert.equal(j.totals.positions,0);
  assert.ok(Buffer.byteLength(summary.text,'utf8')<1_000_000);
});

test('R13 FIRE-to-no-entry abort remains blocked and visible without opening exposure',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const e=Object.create(SagittariusEngine.prototype);const at=Date.now();
  const q={ticker:'DIAGNOSTIC-T',eventTicker:'DIAGNOSTIC',yesBid:80,yesAsk:81,status:'active',quoteAtMs:at,updatedAtMs:at};
  const bolt={id:'DIAGNOSTIC-BOLT',ticker:q.ticker,eventTicker:q.eventTicker,expiresAtMs:at+5000,score:75,features:{eligibleAttacks:[{concept:'Wave Surfer',targetFeasible:true}]}};
  e.settings={...settings,systemName:'SAGITTARIUS',minGameMinutes:0,maxGameMinutes:0,recoveryTrackingHours:24,lightningPlasmaMaxStrikes:1,lightningPlasmaFieldStakeCents:500};
  e.entryExecutionGate=()=>({allowed:true});e.entryChainAdmissionForQuote=()=>({action:'ALLOW',reason:'test'});e.resolveEntryChainAdmission=async()=>({action:'ALLOW',reason:'test'});
  e.atomicThunderBolt={async detect(){return bolt;},noteDecision(){},consume(){throw new Error('must not consume failed entry')}};
  e.athenaCommander={async decide(){return{decision:'FIRE',selectedAttack:'Wave Surfer',reason:'qualified',fireCommand:{}};},memory:{memoryHash:''}};
  let writes=0;e.strategy={lastAthenaFireAbort:null,async executeAthenaFire(){this.lastAthenaFireAbort='database_lock_busy';return null;},async hunterEventAdmissionState(){return{cooldownBlocked:false,eventCapBlocked:false,cooldownScope:'attack',latestByConcept:{}};},async recoveryObservationsBySource(){return new Map()}};
  e.db={async openEntries(){return[];},async recoverySourceEntries(){return[];},async audit(){writes++}};
  e.market={getHistory(){return[];},executableAsk(){return null;}};
  const out=await e.evaluateNewGenerationOpportunities(new Map([[q.ticker,q]]));
  assert.deepEqual(out,[]);
  const funnel=e.entryCandidateFunnelSummary();
  assert.equal(funnel.currentByStage.EXECUTION_BLOCKED,1);
  assert.equal(funnel.currentByReason.database_lock_busy,1);
  assert.equal(funnel.byStage.ATHENA_FIRE,1);
  assert.equal(funnel.byStage.OPENED||0,0);
});
}
