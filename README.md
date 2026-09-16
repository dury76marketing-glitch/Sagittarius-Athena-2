# SAGITTARIUS R69.6 — DIRECT POST-SCARLET JUSTICE ARROW

Release: `SAGITTARIUS-R69.6-JUSTICE-DIRECT-POST-SCARLET-2026-09-07`

## R69.6 Justice Arrow direct post-Scarlet confirmation

R69.6 removes the extra **NEW same-ticker CI1 crash** prerequisite from Sagittarius Justice Arrow. After a durable profitable Scarlet Needle Infinity close, Justice Arrow immediately starts its own same-ticker observation from the Scarlet exit price. It trails a new post-Scarlet peak until its operator `Min crash` is reached, then uses only its own `Min rebound` and `Upward ticks` confirmation before normal hard execution safety and entry-band checks. CI1 can continue learning crash state for the rest of SAGITTARIUS, but it has zero Justice Arrow entry authority in this handoff.

The authoritative chain is therefore:

`3x Crystal Wall proof wins -> Scarlet Needle -> profitable Scarlet Infinity close -> Justice direct observation -> own Min crash -> own Min rebound -> own upward ticks -> hard execution safety -> Sagittarius Justice Arrow -> ATHENA-X1 / Aurora`

A raw CI1 crash cannot create a Justice watch. One profitable Scarlet parent can authorize at most one Justice entry. Same-ticker/owner/mode/durable-parent provenance, restart hydration, duplicate suppression, fixed stake/full configured size, entry band/spread/depth safety, ATHENA-X1 profit authority and Aurora/U-SG1 loss authority remain unchanged.


Package version: `3.3.2`

## R69.5 post-Scarlet Sagittarius Justice Arrow

R69.5 changes only Sagittarius Justice Arrow entry authority. The current path is **three durable Crystal Wall proofs → Scarlet Needle → profitable Scarlet Infinity close → Sagittarius Justice Arrow**. A profitable, fully closed Scarlet Needle on the exact same ticker arms one durable Justice authorization. Justice then waits for a **new CI1 crash episode that begins after the Scarlet close**, follows the existing trough/rebound/up-tick confirmation, and enters only after the existing hard execution-safety chain passes. Pre-Scarlet crashes, other tickers, raw CI1 crashes without an armed Scarlet parent, duplicate/replayed parents, and stale or forged lineage fail closed.

Justice Arrow itself is not redesigned: its operator stake/band/crash/rebound/up-tick controls remain intact, **ATHENA-X1 remains its sole normal profit authority**, Infinity Break is not frozen into a Justice entry, and Aurora/U-SG1 remain the loss-domain authority. One profitable Scarlet parent may authorize at most one Justice entry. A one-time R69.5 settings migration enables the new post-Scarlet Justice path on upgraded deployments that had the former independent Justice path persisted OFF; after that migration, later operator disables remain durable.

The current continuation path is:

`Crystal Wall proof #1 → proof #2 → proof #3 → Scarlet Needle → Infinity Break profit close → NEW same-ticker CI1 crash → Justice Arrow trough/rebound/up-ticks → ATHENA-X1 / Aurora`

## R69.5 release validation

R69.5 acceptance is **841/841 deterministic regressions passing** plus a green `npm run check`. Dedicated SJA3 coverage proves: profitable durable Scarlet parent required; exact same ticker; no pre-Scarlet crash reuse; no raw independent CI1 authority; new post-close crash/rebound/up-tick qualification; full-size Justice SIM entry; ATHENA-X1 profitable full-position exit; frozen Aurora/U-SG1 loss path; durable replay suppression; restart hydration; bounded memory-first quote handling; and one-time enable migration that does not override later operator disables. Crystal Wall and Scarlet Needle doctrine/economics are otherwise unchanged.

## R69.4 doctrine — three independent Crystal Wall proofs before real Scarlet capital

R69.4 retains the complete R69.3 Crystal Wall shadow isolation and Scarlet execution hardening, but adds one final full Crystal Wall observation trade before Scarlet Needle can receive real execution authority. No separate timer, score, MAE classifier or predictive veto is added: **the third Crystal Wall trade itself is the final observation period**.

Current chain:

`CI1 crash episode #1 → Crystal Wall shadow → virtual Infinity profit → FIRST_PROOF_ARMED → no Scarlet / no real capital`

then, on the same exact ticker:

`new independent CI1 crash episode #2 → Crystal Wall shadow → virtual Infinity profit → SECOND_PROOF_ARMED → no Scarlet / no real capital`

then:

`new independent CI1 crash episode #3 → Crystal Wall shadow → virtual Infinity profit → THIRD_PROOF_CERTIFIED → Scarlet Needle real entry → Scarlet own Infinity / Aurora`

The three Crystal Wall proofs must be **consecutive profitable, independent, non-overlapping shadow episodes** under the R69.4 Crystal Wall policy. Any intervening Crystal Wall shadow loss resets the proof sequence to zero. Proof groups are non-overlapping: wins 1+2+3 may authorize one Scarlet; wins 4+5+6 may authorize the next. The same crash episode cannot count twice.

Proofs #1 and #2 are information-only. They never create a Scarlet order, reserve Scarlet capital or consume a Scarlet portfolio slot. Only proof #3 grants strategic continuation authority. Scarlet must then independently pass its fresh executable-book, price-band, target-feasibility, spread, full-depth, capital, capacity, ownership/mode, persistence and concurrency checks.

## Durable proof / restart authority

R69.4 deliberately does **not** add a fragile certificate column. The proof triple is reconstructed from durable PostgreSQL `Crystal Wall Shadow` rows. All three rows must carry the exact current `CRYSTAL-WALL-V3` version and `CW3-R4-THIRD-PROOF-PROVENANCE` policy revision plus the current Infinity provenance. Old R69.3 proof rows cannot silently seed the new triple.

On restart, one or two durable R69.4 Crystal Wall wins remain valid information-only progress because they are reconstructed from PostgreSQL history. If proof history cannot be read, Scarlet fails closed. Immediately before a real Scarlet FIRE, Strategy independently re-reads and revalidates **all three** proof rows. Duplicate/replayed third proofs use deterministic triple authorization, process-local suppression, PostgreSQL advisory serialization and durable opportunity-episode consumption so one proof triple can create at most one Scarlet position.

## Crystal Wall remains fully shadow-only

Crystal Wall has zero broker and portfolio authority in both SIMULATION and LIVE. It does not place BUY/SELL orders, debit simulation cash, reserve real portfolio capital, consume `maxPositions`, consume real event-entry capacity, appear in normal Open/Closed Execution Attack tables, or contribute to the main realized/unrealized/profit-period cards. It persists as `Crystal Wall Shadow` for auditable virtual lifecycle, lineage, P/L, MAE, Infinity and Aurora evidence.

The shadow remains full-fidelity: entry requires the configured crash depth, rebound, upward-tick confirmation and Crystal Wall entry band plus the shared maximum spread and full configured stake-derived executable depth at the fresh best ask. Entry/exit fees use the SIM fee schedule or LIVE Kalshi fee estimator. Virtual Infinity requires fresh full-position executable aggregate net. Virtual Aurora uses the frozen creation-time danger line and full executable exit depth. A virtual Aurora/loss never authorizes Scarlet and resets an active R69.4 proof sequence.

## R69.2 migration/accounting isolation retained

At startup, non-archived **SIMULATION** rows created by the former real Crystal Wall path are reclassified to `Crystal Wall Shadow`, removing them from real portfolio accounting/capacity. Historical/open LIVE `Recovery Hunter` rows are intentionally not reclassified because they may represent broker inventory and must remain exit-protected. New real `Recovery Hunter` creation stays hard-blocked in all modes.

Crystal Wall shadow results remain in the dedicated **CRYSTAL WALL — SHADOW TRADES** table. Main profit cards and normal Open/Closed Trades remain real portfolio concepts only and concept statistics remain reset-scoped. Consumed Crystal Wall crash episodes remain durable/restart-hydrated and bounded, preventing quote-rate re-arm storms.

## Scarlet execution hardening retained

Scarlet authority is not frozen to the third Crystal Wall handoff ask. After proof #3, price movement is allowed only inside the operator Scarlet entry band and only while Scarlet's configured net target remains economically feasible. At commit, the complete stake-derived quantity must still be executable at the fresh best ask; LIVE FOK uses that exact proven limit and cannot sweep higher price levels to manufacture depth. Scarlet keeps its own stake, entry band, Infinity target and frozen Aurora protection.

Operator settings are not overwritten by this release. Persisted Crystal Wall/Scarlet bands, stakes and profit targets remain operator-controlled.

## Release validation result

Release acceptance passed on the packaged R69.4 source: `npm run check` is green and the complete deterministic regression suite is **842/842 passing**. Dedicated R69.4 coverage proves proof #1 no-fire, proof #2 no-fire, proof #3 fire, loss reset, non-overlapping triples, duplicate suppression, same-episode rejection, pre-R69.4 policy isolation, restart recovery, durable-history failure, forged/non-durable proof rejection, SIM/LIVE proof enforcement, Crystal Wall zero broker/capital/P&L authority, Scarlet real execution, Infinity/Aurora exits, accounting isolation and hot-loop bounding. The startup smoke test kept the HTTP process alive, returned `/health` 200, and reached engine-ready in SIMULATION when supplied a database endpoint; `/ready` correctly remained fail-closed without Kalshi credentials. Railway still performs its own clean dependency install followed by `npm test && npm run check` before starting `npm start`.

---

The sections below document retained historical upgrades. Where an older section describes a previous Justice Arrow authority, the R69.5 doctrine above is authoritative; R69.4 remains authoritative for the three-Crystal proof requirement before Scarlet.

## R63 Gemini universe and execution-parity hotfix

R63 makes the shadow-first experiment structurally explicit. **Gemini** is now the isolated shadow universe; **Another Dimension** is the full virtual Attack inside Gemini. Gemini has its own operator-controlled ON/OFF state, reference stake, and minimum/maximum price band. Another Dimension continues to use the retained Great Horn momentum geometry, but it commits no broker order, no real portfolio capital, and no SIM portfolio capital.

Another Dimension remains a complete virtual trade. It freezes its virtual entry economics, simulated fees, +1c net-per-original-contract virtual profit objective, and Aurora loss line at entry; tracks current executable price, peak, low/MAE, executable depth, confirmation state, virtual P/L, exit price, close reason, and timestamps; and exposes the lifecycle in a dedicated Gemini trade table rather than mixing it with ordinary Pegasus/Dragon/Phoenix Cosmos rows. The historical SJA2 release removed the former dependency between a profitable Another Dimension close and Sagittarius Justice Arrow; R69.5 later replaces SJA2 independent entry authority with the post-Scarlet continuation described above.

R63 also repairs a deterministic R62 profitable-close defect in Another Dimension. The queued durable close now separates confirmation from final commit revalidation: the final commit must re-prove fresh full-position executable economics and the still-valid confirmation sequence, but it does not require an artificial third distinct book. That shadow-trade repair remains intact. The former SJA2 independent Justice authority is historical; R69.5 now requires the durable profitable Scarlet parent described above.

Historically R63 introduced **SAGITTARIUS-JUSTICE-ARROW-V2 / SJA2-R1-INDEPENDENT-CRASH-REBOUND-ATHENA-X1** as an independent CI1 crash authority. That entry authority is superseded by R69.5. The retained Justice mechanics still follow the latest trough, reset rebound confirmation on new lower lows, require the configured rebound/up-tick signal and full hard execution safety, freeze **ATHENA-X1** as the sole normal profit authority, carry no Infinity Break snapshot, and delegate the loss domain to Aurora/U-SG1.

R63 also fixes SIM/LIVE execution parity. The prior shared SIM path applied an additional fixed random `simFillProbability` rejection after executable book, price, depth, capital, and safety checks had already passed. LIVE does not use that lottery; it submits the IOC and accepts the broker-reported full/partial/no-fill outcome. R63 therefore retires the independent random rejection from the shared SIM execution path. SIM entry outcomes are now driven by the same visible executable-book planning already used by the hardened entry pipeline, together with normal limit, spread, freshness, capital, topology, fee, and persistence rules. The legacy persisted probability field is normalized to `1` for compatibility and is no longer operator-editable.

Scarlet Needle itself is not redesigned. Its existing post-profitable-Infinity continuation authority, price band, Infinity Break profit exit, Aurora loss protection, idempotency, and hard-safety gates remain intact. The shared SIM parity repair prevents an otherwise valid Scarlet continuation from being discarded only by an unrelated random paper-fill draw.

The R63 paths are therefore:

`Cosmo shadow → COSMO_GREEN → Atomic Thunder Bolt → Athena → ordinary Execution Attack → Infinity Break / Aurora`

`Profitable real Infinity close → Scarlet Needle → Infinity Break / Aurora`

`Profitable Scarlet Infinity close → direct Justice observation → own pullback/trough/rebound/up-tick confirmation → hard execution safety → ATHENA-X1 / Aurora`

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

Infinity Break remains the normal profit exit for the existing R61-style Attack family and Scarlet Needle. Its configured net target is frozen into each applicable entry. Sagittarius Justice Arrow V3 is the explicit exception: its frozen profit authority is ATHENA-X1, and it carries no Infinity Break snapshot.

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
- Sagittarius Justice Arrow V3 is a post-profitable-Scarlet same-ticker continuation. It has no raw independent CI1 authority; it retains ATHENA-X1 profit authority and the full real-entry safety chain.
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

## Railway HF5 source-build deployment contract

HF5 restores the proven Sagittarius Railway deployment structure used by the older successfully deployed repository. The repository is source-built by Railway Railpack rather than a custom Dockerfile. `railway.json` freezes `builder: RAILPACK`, runs `npm test && npm run check` as the build gate, starts with `npm start` (`node src/index.mjs`), exposes `/health` for process liveness, and keeps `/ready` as strict trading readiness. The custom Dockerfile and `.npmrc` dependency introduced during the earlier Railway hotfix attempts are removed. No Mega Wave trading doctrine changes in HF5.
