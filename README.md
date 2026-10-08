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
