# SAGITTARIUS SE2-R8 — RECOVERY OUTBOX, QUOTE-BATCH AND BOOK-LIVENESS REPAIR (2026-10-11)

**Status: THREE LOCAL VERIFICATION ROUNDS PASSED (1,069 pass, 0 fail, 2 real-PostgreSQL skips per run); ISOLATED RAILWAY SIM STAGING ONLY. DO NOT ENABLE LIVE.**

SE2-R7 passed unit simulations but left three connected operational liveness gaps:

1. On startup it searched only the **latest 5,000** total `sag_entries` rows for Aurora stopped parents. A shadow-heavy ledger can easily exclude an older genuine hard-stop. SE2-R8 uses a narrow, reset/owner/mode/concept-scoped PostgreSQL `NOT EXISTS` outbox query and rechecks it periodically, repairing missed asynchronous callbacks and failed initial watch inserts. All rearmed watches retain their original stop timestamp.
2. SE2-R7 coalesced pending Starlight quote updates to a **single last quote** during database writes. A seven-uptick recovery can lose six qualifying ticks. SE2-R8 durably advances bounded **ordered batches** in a single CAS update and reports overflow/reordering. Stale observations cannot manufacture a qualification; terminal market quotes remain authoritative.
3. The R7 REST watch refresh used `getMarket()` alone. If the cached verified book was invalid/stale, `MarketHub.seed` inherited `bookInvalid` and Starlight was never eligible. SE2-R8 refreshes stale/invalid watch orderbooks via the existing trusted book verification before subsequent REST quote observation. Final execution still requires real executable depth.

Startup DB recovery errors are now exposed and retried, rather than silently ignored until another Railway boot. Existing operator settings, stop-loss-only activation, Starlight crash/rebound/ticks/observation/band rules, Aurora, Athena, Infinity, all other attacks, exclusions, and their Game Clock doctrine remain unchanged.

The revised workflow must pass native `npm ci && npm test && npm run check` on Railway plus both opt-in disposable PostgreSQL integration gates. Local `pg`/`ws` stand-ins prove deterministic source logic but do **not** certify PostgreSQL concurrency or broker behavior. The operator must confirm the actual Railway release fingerprint and watch lifecycle in an exported diagnostic ledger after deployment.

---

# SAGITTARIUS SE2-R7 — STARLIGHT ZERO-ENTRY LIVENESS REPAIR (2026-10-11)

**Status: THREE LOCAL AUDITS PASSED; ISOLATED RAILWAY SIM STAGING ONLY. NOT LIVE-CERTIFIED.**

From a single-system, same-reset pair of 09:28 UTC ledger exports, 11 executable
Aurora hard-stop exits and zero Starlight entries were recorded. R6 still had
three independently reproducible Starlight failure paths: REST discovery quotes
failed to invoke its dedicated observer; temporary entry gate outages stranded
READY watches until new WS movement; and SIM createHunter exceptions stranded
EXECUTING claims. R7 repairs all three while retaining operator thresholds and
the approved SE2-R6 post-stop independent recovery authority.

**Additional hardening:** recovery ticker REST watch polling every ~15s during
fast-phase with per-cycle bounded load; READY wake-up every ~3s; fair rotation
past 16 watches; stale SIM claim reconciliation; uncertain LIVE claims fail closed;
per-parent StrategyEngine rejection attribution; durable scoped PostgreSQL watch
counts/status/reasons included in ledger ZIP diagnostic-summary.json.

The complete STOP -> WATCH -> REST MARKET QUOTE -> QUALIFY -> TEMPORARILY DISABLED
ENTRY -> REOPEN EXECUTION -> REAL StrategyEngine -> SIM INSERT -> CONSUMED chain was
executed successfully by the SE2-R7 regression test. Other attacks' trading
rules, Game Clock, Athena, Aurora, Infinity and market exclusions remain intact.

**Three complete independent local test passes:** each 1,060 PASS / 0 FAIL / 2
SKIPPED; `npm run check` PASSED three times. Local `pg`/`ws` substitutes were used
because native dependencies are not available here; those substitutes are NEVER
included in the packaged ZIP. The two skipped gates require a disposable real
PostgreSQL instance (R12 transaction and SE2-R5 watch CAS/durability).
Native Railway install, durable PG crash/restart and genuine LIVE broker
integration remain unverified: **do not arm LIVE**.

**Railway staging acceptance:** `npm ci && npm test && npm run check`; run the
separate real-PostgreSQL gates with `SAGITTARIUS_TEST_DATABASE_URL` and
`SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1` pointed only to a disposable TEST DB.
In SIM, export the first post-stop ledger: diagnostic-summary.json now includes
`starlightRecovery.runtime` and `starlightRecovery.durable` records; confirm a
persisted stop parent, price observations, terminal reasons, and an actual child
or an explicit gate reason, rather than assuming each stopped parent must trade.

---

# SAGITTARIUS SE2-R6 — INDEPENDENT POST-STOP STARLIGHT (2026-10-11)

**Status: STAGING/SIMULATION VALIDATED. NOT LIVE-CERTIFIED.**

SE2-R6 is based on the exact audited SE2-R5 source. The operator expressly
changed Starlight Extinction's entry authority: a genuine durable Aurora
`hard_stop_loss` arms one Starlight watch per stopped parent; thereafter the
recovery entry depends on Starlight's own configured post-stop crash, rebound,
upward ticks, observation delay and price band.

**Starlight-only strategic restrictions removed:** ordinary Game Clock
(including its min/max/unknown-time veto), global event-entry cap, Hunter
cooldown, same-ticker cross-Attack exclusion, unrelated event-admission SQL,
CI1 crash-learning dependency, and the arbitrary observation-plus-six-hour
watch expiration. A watch ends on market finality, operator reset/mode change,
consumption, or a demonstrated invalid parent, not merely because the game
runs past an arbitrary time limit. Existing active R5 watches are upgraded via
revision-checked persistence without resetting their recovery history.

**Safety gates retained:** enabled Starlight operator switch, genuine hard-stop
parent and same owner/system/mode/reset epoch, no Starlight self-chain, one
child per stopped parent, crash/rebound/tick/observation/band signal, fresh
tradable market and executable book, spread/size/exposure/capital capacity,
LIVE arming, broker order and fee integrity, final signal revalidation, and
durable CAS/receipts/restart reconciliation. Other Attacks, Athena, Aurora,
Infinity, Andromeda exclusions, their Game Clock doctrine and their trading
settings are unchanged. Starlight's removal of cross-Attack/event caps can
increase correlated exposure across multiple stopped parents; operator should
review total configured position capacity before enabling LIVE.

**Three independent local test passes:** each 1,050 passed / 0 failed / 2
skipped. New tests exercise the *real StrategyEngine* (not mock-only), after
stop-loss, recovery at 240 game minutes, two stopped parents on one market,
8-hour recovery, previous-watch migration, signal collapse and capital/market
safety. `npm run check` passed three times. Local `pg`/`ws` package stand-ins
were used because registry/network access was unavailable; they are excluded
from this release package. Live PostgreSQL durability, native Railway install,
and real broker integration remain unverified. No LIVE approval is implied.

For native staging validation: `npm ci && npm test && npm run check`. Supply a
**disposable** PostgreSQL test database via `SAGITTARIUS_TEST_DATABASE_URL`
with `SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1` to run otherwise skipped
integration gates; NEVER use a production database for destructive tests.

---

# SAGITTARIUS SE2-R5 — DURABLE STOP-LOSS RECOVERY (2026-10-10)

**Status: STAGING CANDIDATE — DO NOT ENABLE LIVE TRADING.**

R5 is a doctrine-preserving corrective release built from SE2-R4. The only
functional scope is Starlight Extinction's post-`hard_stop_loss` recovery chain:

- Original stop-loss time, parent/system/owner/mode/reset epoch, stop price,
  crash peak/trough, fresh upticks, release/expiration deadlines, retries,
  claim status and consumption are written to `sag_starlight_recovery_v1`.
- Stale writers cannot overwrite a newer revision; a parent is allowed one
  deterministic recovery entry ID even if two Railway processes overlap.
- Scanner priority includes active Starlight watches; quote updates are
  coalesced and committed through a bounded database lane before execution.
- A real post-stop decline is required before Starlight can count a crash;
  a purely rising tape is not a crash. Falling prices reset fresh upticks.
- SIM/LIVE execution verifies the same current, durable watch at its entry
  boundary and immediately before actual insertion/broker submission.
- The existing **ordinary Game Clock** restriction remains unchanged for
  Starlight. It does not silently inherit CI1's independent exemption.
- Parent/child SIM/LIVE isolation and pending broker-intent replay protection
  remain hard safety requirements. No automatic buy follows a stop-loss.

The two local audit cycles run the complete existing suite and SE2-R5 fault
injection tests. Unit tests here require real `pg` and `ws` modules installed
from the pinned `package-lock.json`; temporary dependency stand-ins are not
valid evidence for production certification.

**Railway staging gate:** `npm ci && npm test && npm run check`.

**Disposable PostgreSQL durability gate:** supply
`SAGITTARIUS_TEST_DATABASE_URL` pointing to a TEST-ONLY writable PostgreSQL
server and `SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1`, then rerun `npm test`.
The gate creates and drops isolated test schemas and must never run against
production records. Confirm no tests are skipped and the broker integration
checks are completed before any LIVE authorization.

---

# SAGITTARIUS AU2 SE2 — STARLIGHT STOP-LOSS RECOVERY (2026-10-10)

RELEASE `SAGITTARIUS-AU2-SE2-R5-DURABLE-RECOVERY-2026-10-10`.

Starlight Extinction (Crash Recovery Hunter) is no longer a normal Cosmo GREEN / Bolt / Athena initial-entry attack.
It is armed only after a real executable hunter closes on `hard_stop_loss`.
It keeps its own crash / rebound / upward-tick card, price band, observation window, stake, and Infinity/X1.
One attempt per parent. No self-chain. Paper feeders and Crystal Wall paper do not arm it.
Event cap and hunter cooldown are bypassed only for that recovery seat.
Simulation-validated. Not LIVE-certified.

---

# SAGITTARIUS AU2 FACTORY-CLONE-DIAG (2026-10-10)

**Factory defaults cloned from diagnostic export 2026-10-10T09-46-37Z.**
RELEASE `SAGITTARIUS-AU2-FACTORY-CLONE-DIAG-2026-10-10`.

New installs and the factory operator patch now start with the exact operator card
from that SIMULATION diagnostic: minGameMinutes 10, maxGameMinutes 120,
auroraDamageControlPercent 35, attack min-entry 74 / max 88, observation minutes
as exported, Infinity 13, stakes 500, GE ON, X1 ON for the attacks, etc.
Prior strategic code is unchanged. Staging candidate — not LIVE-certified.

---

# SAGITTARIUS R12 — BROKER RECONCILIATION AND DURABLE RECEIPT SAFETY (2026-10-10)

**Engineering status: STAGING CANDIDATE — NOT APPROVED FOR LIVE TRADING.**
This R12 recovery release is based on the exact uploaded R11 ZIP. Earlier release
headings below are historical and do not supersede the R12 safety status.

- Complete `/portfolio/fills` cursor walks are required before a historical
  order can become confirmed economic truth. Failure, malformed pages,
  repeated cursors, duplicate fill IDs, price/fee defects and mismatched
  cumulative order totals remain ambiguous; no partial aggregate is accepted.
- Exact broker order ID, client receipt and ticker are checked before applying
  recovered BUY or SELL evidence. A negative broker order search alone does NOT
  release a durable receipt, since accepted orders may become visible later.
- Both newly accepted LIVE BUY and LIVE SELL order responses undergo exact
  broker-ID reconciliation when the adapter supports it. Unverified responses
  remain pending, with the original ID persisted and protected from resubmission.
- Cumulative SELL receipts and the position ledger are written in a single
  PostgreSQL UPDATE protected by an expected client-ID/fill-count predicate.
  A concurrently updated receipt cannot be overwritten by a stale worker.
- All pre-existing strategic configuration, attack algorithms, entry/exit
  authorities, waits, bands, Andromeda exclusions and SIM doctrine are unchanged.
  Existing database records and waits are not reset or discarded.

**Verification:** deterministic two-round regression suites have passed with
external dependency stand-ins. Those are *not* equivalent to a native Railway
build, real PostgreSQL durability or actual Kalshi integration. This runtime
cannot install npm dependencies from the registry and has no provided disposable
PostgreSQL or Kalshi demo credentials. These tests remain mandatory before LIVE:

1. On a disposable Railway staging deployment, use Node 22+, run `npm ci` and
   `npm test && npm run check` with the real `pg` and `ws` modules, no loader.
2. Set `SAGITTARIUS_TEST_DATABASE_URL` to a **disposable PostgreSQL database**
   and `SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB=1`; then rerun `npm test`.
   The opt-in test checks committed receipt durability, rollback when a database
   client dies mid-transaction, stale-worker compare-and-set and a new Node
   process recovering the persisted position. Never aim this test at LIVE data.
3. Reconcile account orders/inventory with the durable database and exercise
   the eight original R10 acceptance cases using a broker sandbox or safe,
   controlled non-LIVE integration tests. Do not place real-money orders for
   verification. Leave any ambiguous order IDs quarantined pending proof.
4. Recheck the `src/engine.mjs` runtime build/source hash and retained operator
   settings at deployment, not only the R12 ZIP name. No runtime release-ID or
   trading doctrine changes were made to that file.

---

# SAGITTARIUS CQ3 repair — 8 October 2026

Build ID: `SAGITTARIUS-CQ3-2026-10-08`. This is the current repair release. The earlier release notes below are historical.

## What this repair changes

- Orders use the current crash watch and a quote witness that observes reversals during asynchronous work. All eight independent attacks revalidate immediately before the SIM insert or LIVE broker submission, after cash, funding, intent persistence and lock waits. Changed settings, expired authority, deleted watches, invalid books and finalized markets block submission. A definitely unsubmitted LIVE intent is marked rejected; ambiguous submitted orders keep the existing reconciliation path.
- The market adapter supplies connection-scoped sequence identity and process-scoped quote revisions. Legitimate updates in the same millisecond reach crash learning; replayed or older observations cannot become fresh crashes. A concurrent REST response cannot replace a newer canonical quote with its older price.
- Scanner priority includes all active crash states and executable watches. Terminal watch cleanup leaves owned positions and consumed episodes intact. There is no timed wipe or reset after a number of trades.
- Startup seals old card migration flags before any migration can replace the saved card, including saved cards whose flags are missing. Missing settings on a genuinely fresh database still use the existing fresh-install defaults.
- Ledger downloads include lossless retained row evidence, partition snapshots and oversized evidence into files below 1,000,000 bytes, and expose coverage and hashes. Download jobs cannot share a cursor across changed mode/reset/filter cohorts. Rejected intents are not open exposure. An unavailable historical valuation is not presented as known P/L.
- `/health`, export headers and newly frozen entries identify the repair build. Historical entries are not relabeled as having executed this repair. `build.sourceSha256` covers runtime source, public assets, package manifests and Railway configuration; tests and documentation have separate archive/file hashes.

The operator's bands, stakes, Aurora percentage, 13-cent target (when configured), crash/rebound/uptick thresholds, attack enablement, GE and Multiply values are preserved. Profit-exit and stop policies and ordinary-clock exemptions are unchanged. Existing open entries retain their frozen settings. A correct signal path cannot guarantee profitable results.

## Validation

The release suite contains 959 passing tests, including valid and invalid entry scenarios for all eight attacks in SIMULATION and mocked LIVE mode, original GE/Multiply and protection regressions, three successive startup checks with missing migration flags, a 1,000-market terminal-watch run, scanner interleaving, sequence ordering, concurrent downloads and lossless oversized evidence reconstruction. `npm run check` also passes. See the accompanying validation report for exact archive hashes and fresh-extraction results.

Mocked LIVE testing exercises the actual strategy code with fake broker responses and in-memory database fixtures. It does not place real orders or certify Railway networking, production database availability or actual exchange fills.

## Railway deployment

1. Stop new entries in the existing dashboard before replacing code. Retain the current PostgreSQL database, Railway volume, environment variables and credentials. Do not reset or wipe the database.
2. Deploy the COMPLETE ZIP contents as the project root: `package.json`, `package-lock.json`, `railway.json`, `src`, `public`, and `tests`. The overlay ZIP is only for the exact supplied 8 October CAUSAL-QUOTE-R2 baseline; prefer the complete package if the current source is uncertain.
3. Use the included Railway configuration: build `npm test && npm run check`, start `npm start`, liveness `/health`. Node >=22 is required. Install dependencies from the committed lockfile (`npm ci` for a manual build). No `dist` directory or compilation step is used.
4. Confirm `/health` reports this build ID and the expected source hash from the validation report. Compare the saved settings, reset timestamp and ledger with the pre-deployment snapshot. Confirm broker reconciliation and protection readiness before resuming entries.
5. Start with the intended mode. Existing startup policy is preserved: LIVE is initially disarmed during boot, and an authorized persisted LIVE selection can resume automatically after the existing readiness gates pass. LIVE remains disabled when deployment policy disallows it. Stopping new entries before deployment avoids relying on an automatic restart as a controlled test boundary.
6. Download a fresh ledger package. Check `manifest.json` says `collectionComplete: true`, missing/unexpected counts are zero, and no duplicate IDs are present. A partial download retains its cursor for retry in the same cohort. Every JSON/text member is below 1 MB; the ZIP containing all parts can exceed 1 MB. Retained data is exported; previously unrecorded quote paths cannot be reconstructed.

If the new instance is not ready, keep new entries stopped and investigate the reported health/reconciliation failure. Preserve the durable ledger and open-position ownership throughout.

---

## AU2 X1-R2 emotion-from-rise (2026-09-28)

Athena X1 now harvests from emotion: percent rise from frozen entry. 10% is happy. Higher rise raises emotion. A stall at the high or a small fade at high emotion is anxiety — "I want that money right now" — and sells the full still-green position. Justice Arrow min-profit floor, Aurora loss side, and no-split full-position doctrine stay unchanged. Open R1 rows migrate onto R2 on the next fresh book.

# SAGITTARIUS AU2 — Scarlet Needle and Lightning Plasma as regular Attacks

RELEASE `SAGITTARIUS-AU2-CI1-R3-STOP-RESET-HALT-2026-10-02`

Scarlet Needle and Lightning Plasma are no longer follow-up Attacks. They use the same Cosmo GREEN → Atomic Thunder Bolt → Athena FIRE path as Great Horn and Wave. Close events do not arm them. Crystal Wall / Gemini-loss continuation executors are inert.

Unified AU1 confirmation (crash / rebound / upward ticks) and the per-Attack X1 / Infinity toggle remain. Athena Exclamation stays the meta-attack. Justice Arrow and Crystal Wall stay independent CI1 crash-rebound authorities.

Simulation-validated. Not LIVE-certified.

---

# SAGITTARIUS AU1 — UNIFIED CONFIRMATION / FOLLOW-UP / X1 TOGGLE

Release: `SAGITTARIUS-AU2-CI1-R3-STOP-RESET-HALT-2026-10-02`

Package version: `3.3.1`


## R63 Gemini universe and execution-parity hotfix

R63 makes the shadow-first experiment structurally explicit. **Gemini** is now the isolated shadow universe; **Another Dimension** is the full virtual Attack inside Gemini. Gemini has its own operator-controlled ON/OFF state, reference stake, and minimum/maximum price band. Another Dimension continues to use the retained Great Horn momentum geometry, but it commits no broker order, no real portfolio capital, and no SIM portfolio capital.

Another Dimension remains a complete virtual trade. It freezes its virtual entry economics, simulated fees, +1c net-per-original-contract virtual profit objective, and Aurora loss line at entry; tracks current executable price, peak, low/MAE, executable depth, confirmation state, virtual P/L, exit price, close reason, and timestamps; and exposes the lifecycle in a dedicated Gemini trade table rather than mixing it with ordinary Pegasus/Dragon/Phoenix Cosmos rows. **SJA2 removes the former dependency between a profitable Another Dimension close and Sagittarius Justice Arrow.**

R63 also repairs a deterministic R62 profitable-close defect in Another Dimension. The queued durable close now separates confirmation from final commit revalidation: the final commit must re-prove fresh full-position executable economics and the still-valid confirmation sequence, but it does not require an artificial third distinct book. SJA2 leaves that shadow-trade repair intact while making Justice Arrow independent from the shadow close.

Sagittarius Justice Arrow is upgraded to **SAGITTARIUS-JUSTICE-ARROW-V2 / SJA2-R1-INDEPENDENT-CRASH-REBOUND-ATHENA-X1**. Its entry authority now clones Crystal Wall V3: a qualifying CI1 crash can arm the same-ticker recovery watch from either an owned real position or another tracked market; the latest trough is followed, new lower lows reset rebound confirmation, and a fresh configured rebound/up-tick signal may authorize one fixed-size entry per crash episode. Justice Arrow bypasses ordinary Athena/Bolt/Game-Clock/event-cap/cooldown strategic vetoes but retains full lifecycle, spread, executable-depth, global max-position, funding, persistence-before-LIVE-order, ownership, and reconciliation safety. After fill it freezes **ATHENA-X1** as its sole normal profit authority, carries no Infinity Break snapshot, and delegates the loss domain to Aurora/U-SG1.

R63 also fixes SIM/LIVE execution parity. The prior shared SIM path applied an additional fixed random `simFillProbability` rejection after executable book, price, depth, capital, and safety checks had already passed. LIVE does not use that lottery; it submits the IOC and accepts the broker-reported full/partial/no-fill outcome. R63 therefore retires the independent random rejection from the shared SIM execution path. SIM entry outcomes are now driven by the same visible executable-book planning already used by the hardened entry pipeline, together with normal limit, spread, freshness, capital, topology, fee, and persistence rules. The legacy persisted probability field is normalized to `1` for compatibility and is no longer operator-editable.

Scarlet Needle itself is not redesigned. Its existing post-profitable-Infinity continuation authority, price band, Infinity Break profit exit, Aurora loss protection, idempotency, and hard-safety gates remain intact. The shared SIM parity repair prevents an otherwise valid Scarlet continuation from being discarded only by an unrelated random paper-fill draw.

The R63 paths are therefore:

`Cosmo shadow → COSMO_GREEN → Atomic Thunder Bolt → Athena → ordinary Execution Attack → Infinity Break / Aurora`

`Profitable real Infinity close → Scarlet Needle → Infinity Break / Aurora`

`CI1 crash → Sagittarius Justice Arrow V2 → trough tracking → rebound confirmation → hard execution safety → ATHENA-X1 / Aurora`

Runtime work remains bounded. Another Dimension and Justice Arrow use separate single-concurrency workers; Justice Arrow crash watches are bounded and quote observation remains memory-first; Gemini open-attempt deduplication is bounded; recent Another Dimension results are capped. Recovery-priority tickers are rebuilt from the union of Crystal Wall and Justice Arrow active watches so one crash engine cannot starve the other after refresh/restart.

## R61-HF1 scanner and settings-persistence hotfix

The R61 production diagnostic exposed one deterministic scanner regression: `fullScan()` retained a stale reference to the retired delayed-Scarlet variable `scarletPriorityTickers` even though Scarlet V2 no longer has a priority-arm/watch lane. That reference has been removed. Full-scan priority now contains only open owned entries plus the live Recovery and Crash priority sets; Scarlet continuation remains event-driven directly from a durable profitable Infinity close.

Settings writes are also hardened with PostgreSQL read-after-write verification. An operator edit such as `auroraDamageControlPercent: 15` is not reported as successfully persisted until the saved runtime settings record is read back and the edited value matches exactly. Diagnostics expose `settingsPersistence` with the last verified keys/values or an explicit verification error. Existing open positions keep their frozen creation-time Aurora percentage. This hotfix does not silently migrate or overwrite an operator-selected Aurora percentage.

## Mission

SAGITTARIUS remains a short-horizon momentum-execution system. Normal discovery and entry remains:

`Fresh market/book truth → Game Clock → Cosmos shadow → COSMO_GREEN → Atomic Thunder Bolt → Athena FIRE → hard execution safety → Execution Attack → Infinity Break / Aurora Execution`

R61 adds one explicit strategic exception:

`Profitable Infinity close → Scarlet Needle continuation authorization → hard execution safety → same-ticker Scarlet Needle → Infinity Break / Aurora Execution`

Scarlet Needle bypasses only the normal strategic discovery chain. It never bypasses executable-market safety.

## Mega Wave 1 — Aurora verified frozen danger gate

Every new real position freezes its Aurora danger line from the exact fill economics and configured `auroraDamageControlPercent`.

R61 makes that frozen line the mandatory gate for a normal automated loss exit. While fresh executable market truth remains above the frozen danger line, SLW1 may observe, classify and learn, but it has no sell authority. A fresh, valid executable YES bid must genuinely touch or cross the frozen Aurora line before U-SG1 loss-exit authority is activated.

The verification is fail-closed:

- market/book must be freshly revalidated;
- quote/book timestamps must be acceptable;
- a current executable YES bid must exist;
- both the fresh quote bid and executable bid must be at or below the frozen line;
- stale, future-skewed, missing or contradictory evidence cannot activate the stop;
- gap-through remains protected and exits at the best safely executable price;
- Emergency Exit and settlement remain independent safety/fallback paths;
- Infinity Break is unaffected.

Creation-era legacy positions that do not contain the frozen R61-compatible Aurora snapshot retain their compatibility protection path so old/open positions are not orphaned.

## Mega Wave 2 — Scarlet Needle V2 continuation authority

The former fixed 10-cent retracement/arming doctrine is removed from active production behavior.

Scarlet Needle V2 is now `SCARLET-NEEDLE-V2`, policy `SN2-R1-POST-PROFIT-SAFE-CONTINUATION`.

A fully closed real Execution Attack with a positive net `infinity_break` result authorizes one immediate Scarlet continuation attempt on the same exact ticker and side. No new Cosmos GREEN, Atomic Thunder Bolt, Athena strategic Attack selection, retracement or ordinary Attack cooldown is required.

The continuation is not a blind takeover. Before opening, the existing hardened entry machinery must still prove:

- same system and owner;
- same execution mode as the closed parent;
- same exact ticker/event and side;
- active/unsettled market;
- fresh game-clock authorization;
- fresh verified quote and order book;
- executable ask/depth and shared spread safety;
- Scarlet operator entry-price band and stake;
- capital and max-position/event topology;
- exact-ticker/Attack concurrency locks;
- valid SIM/LIVE authorization;
- viable frozen Aurora protection;
- sealed, short-lived no-chase execution envelope.

The continuation authorization is one-shot. If the hard-safety attempt cannot execute, it becomes terminally BLOCKED rather than chasing the market indefinitely.

### Repeat control

New operator setting: `scarletNeedleMaxRepeats`.

- `0`: no Scarlet continuation.
- `1`: at most one Scarlet continuation after the original profitable trade.
- `N`: at most N consecutive Scarlet continuation waves in that chain.
- maximum accepted value: `100`.

A profitable Scarlet close can authorize the next Scarlet wave until the chain-local repeat maximum is reached. A loss, blocked hard-safety attempt, market ineligibility or repeat limit ends the chain.

Each Scarlet wave is a new economic position with its own entry fee basis, Infinity target and newly frozen Aurora danger line. It never inherits the parent stop.

## Scarlet idempotency and choke protection

Each profitable close creates a deterministic authorization ID based on the parent close and repeat number. R61 protects the handoff with:

- process-local in-flight suppression;
- PostgreSQL advisory serialization;
- durable opportunity-episode authorization before execution;
- terminal OPENED/BLOCKED consumption state for restart/replay safety;
- a bounded single-concurrency continuation queue so profit-close handoffs cannot starve quote protection or create a database burst.

ProfitGuard dispatches the post-close handoff asynchronously after the close is durable, so continuation work cannot block the protection loop.

## Diagnostics

R61 explicitly exposes the exception rather than hiding it behind the old `noBoltNoAttack` invariant:

- `normalAttackExecutionOnlyAfterAthenaFire: true`
- `scarletNeedleStrategicAuthorityException: true`
- `noBoltNoAttackExceptions: ["SCARLET_NEEDLE_POST_PROFIT_CONTINUATION"]`
- `scarletNeedleContinuationAuthority: true`
- `scarletNeedleTrigger: "POST_PROFIT_INFINITY_CLOSE"`
- `scarletNeedleRetracementTriggerEnabled: false`
- `scarletNeedleMaxRepeats`
- continuation runtime counters and latest event
- Aurora gate policy and SLW1 observer role above the danger line

The normal Athena Attack pool excludes Scarlet Needle; Scarlet cannot silently return to ordinary Bolt-time selection.

## R60-HF1 reliability retained

The R60-HF1 reset-safe/nonblocking-intelligence protections remain intact:

- Reset Simulation archives only the economic SIM cohort.
- Tracker intelligence, rolling market histories, crash/learning state, Atomic Thunder research and Athena ranking memory survive reset.
- The simulation mutation epoch/drain barrier blocks stale pre-reset commits.
- Historical Athena/Atomic Thunder hydration remains background-only and cannot block trading readiness.

## Profit and loss authority

### Infinity Break

Infinity Break remains the normal profit exit for the existing R61-style Attack family and Scarlet Needle. Its configured net target is frozen into each applicable entry. Sagittarius Justice Arrow is the explicit R62 exception: its frozen profit authority is ATHENA-X1, and it carries no Infinity Break snapshot.

### Aurora Execution

Aurora remains the normal loss gate. `auroraDamageControlPercent` remains operator editable and is frozen at entry together with the exact fill economics and fee assumptions. Aurora does not trail.

SLW1 is observation-only above the frozen Aurora line and cannot pre-empt it.

## Hard safety retained

- Fresh installs start in SIMULATION.
- LIVE remains explicit and disarmed after restart.
- Owner isolation is mandatory.
- Fresh uncrossed market/book validation remains mandatory.
- Executable depth, capital, event/max-position topology, locks, persistence-before-LIVE-order, reconciliation and settlement remain fail-closed.
- Galactic Explosion remains topology control only.
- DBPI/RGM bounded database and memory-pressure controls remain non-trading authority.
- Cosmos remains broker-free reference/shadow trading.
- Another Dimension is a separate shadow-Attack class, not a Cosmos feeder and not a portfolio position.
- Sagittarius Justice Arrow V2 is an independent CI1 crash-rebound authority, not a Gemini/Another Dimension continuation; it retains ATHENA-X1 profit authority and the full real-entry safety chain.
- Atomic Thunder remains signal-only.
- Athena remains sole strategic selector for normal Bolt-driven Attacks.

## Railway deployment contract

- Node engine: `>=22`
- Start: `npm start` → `node src/index.mjs`
- Build gate: `npm test && npm run check`
- Liveness: `/health`
- Readiness: `/ready`
- Railway restart policy: `ON_FAILURE`

Required production environment variables remain:

- `DATABASE_URL`
- `KALSHI_API_KEY_ID`
- `KALSHI_PRIVATE_KEY_PEM`
- `KALSHI_BASE_URL=https://api.elections.kalshi.com/trade-api/v2`
- `DEFAULT_ENGINE_MODE`
- `ALLOW_LIVE_TRADING`

R62 starts directly from checked source and requires no committed `dist/` tree.

---

## R11 broker receipt and restart recovery repair (2026-10-10)

**Trading doctrine is unchanged.** This repair is confined to LIVE execution,
position accounting, persistence and deterministic regression coverage. The
strategy configurations, market-family exclusions, signal qualifications,
Galactic child wait/release, Athena X1, Aurora, Freezing Coffin and settlement
policy definitions are not edited.

Changes from the R10 source baseline:

- Broker order recovery first requests `/portfolio/orders/{order_id}` for a
  durable, known broker ID. Client ID fallback now traverses cursor pages and
  never calls an incomplete/erroring result proof of absence.
- Each LIVE SELL has a durable `exit_execution_state` JSONB receipt on its
  owning `sag_entries` row. Submitted client IDs, broker IDs, cumulative
  contract counts, fees and notional are captured as accounting provenance.
  On restart, only the increase in broker-confirmed cumulative quantities is
  charged to the ledger; repeats and conflicting receipts do not credit a
  second fill.
- A nonterminal partial order retains its pending client ID, preventing an
  additional SELL of the same owned position. Broker order-ID mismatches,
  unverified fill prices and inconsistent cumulative economics hold the order
  for reconciliation with explicit audit diagnostics.
- `entry_pending` reconciliation uses the known broker order ID first, and
  records only already broker-confirmed quantities for nonterminal partial
  BUYs; the remainder is held until the order is terminal.
- When a LIVE BUY has already filled and post-fill Freezing Coffin setup
  fails, it persists a protection exit obligation for the *actual filled*
  contracts instead of returning with the original planned-size intent.
- Settlement also checks for unresolved SELL receipts when called directly,
  not only when reached through the ordinary protection loop.
- Deterministic R11 regression cases are incorporated into the existing
  `tests/deployment.test.mjs` file to retain the fixed 52-authored-source-file
  Railway packaging limit (53 entries when `package-lock.json` is included).

**Deployment gate:** `npm ci && npm test && npm run check` in an environment
with the pinned `pg` and `ws` dependencies. This archive has not been verified
against a real Kalshi account, broker sandbox, live market or PostgreSQL
server. Do not activate LIVE without that independent gate, schema migration
verification and reconciliation with existing broker positions.

## R13 read-only choke diagnosis (2026-10-10)

The R13 upgrade DOES NOT relax the trading doctrine, risk limits, entry bands,
entry Game Clock window, Andromeda/market exclusions, or execution protections.
The Oct 10 SIM ledger investigation found only 1 and 2 executed attacks across
two five-hour independent runtime periods, despite over 1,100 Cosmos shadow
rows per system. The current operator configuration uses 80-88c Attack entry
bands and a +13c **net** Infinity Break target with 2c SIM entry and 2c SIM
exit fees. Economic feasibility therefore leaves 80-82c as the actual
reachable Attack entry prices (83c would require a 100c executable exit).
This is an intentional economic-safety filter, **not** permission to loosen it.

To distinguish genuine upstream stalls from authorized strategy refusals, R13
adds read-only `entryChokeDiagnostics` to `diagnostic-summary.json` inside the
existing **Download Ledger** ZIP. Its sections are `entryAdmission` (clock
and queue), `candidateFunnel` (Bolt through Athena), `entryPipeline`
(execution), and `boltFilters` (fee-aware eligibility and GREEN state).
`boltFilters.effectiveEconomicEntryWindows` shows the exact original
fee-estimator result for each enabled Bolt-path Attack, separately by mode.
Counters are process-lifetime observations rather than unique trades; bounded
`distinctShadowReasons` and `recent` aid causal interpretation. Neither this
telemetry nor its nonblocking export is a trading authority. The ledger
still cannot reconstruct market-by-market rejected candidates from before
this deployment: collect a fresh diagnostic-summary after the upgraded
system runs. Review R13 telemetry before attributing the remaining Bolt-to-
entry conversion losses to an implementation defect.

The Railway build and native dependency tests must pass at deploy time. Run
`npm test && npm run check` on Railway with the genuine `pg` and `ws` packages.
Continue SIM mode and do not activate LIVE solely on the basis of this
observability release; real PostgreSQL crash durability and safe broker
integration verification remain separate requirements.

## SE2-R9 Starlight recovery audit (11 October 2026)

This staging-only repair addresses five implementation/forensics weaknesses found in
SE2-R8: accepted same-millisecond quote revisions formerly lost upward ticks,
old pre-stop quotes could contaminate a new watch, PostgreSQL latency could
cause legitimately received observations to age out before persistence,
Starlight maintenance was tied to the ordinary scan cadence, and redundant
unchanged quotes generated a separate PostgreSQL watch write for every parent.

Starlight's stop-loss-only activation, operator crash/rebound/tick/observation
thresholds, executable ASK entry band, spread/capital/broker safeguards, and
other attacks' trading doctrine have **not** been loosened. The latest 27-watch
SIM stress test showed `price_band` rejection at the checkpoint; R9 makes
that rejection independently auditable by exporting bid, ask, and spread.

Three full deterministic verification rounds pass with 1080 pass / 0 fail /
2 skipped per round. The skipped real-PostgreSQL integration gates and native
Railway/broker tests are outstanding. **SIM staging only, never LIVE without
those production safety proofs.** See the accompanying SE2-R9 engineering report.
