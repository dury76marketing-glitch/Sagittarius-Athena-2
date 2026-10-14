# SAGITTARIUS MW1-R3 - Shadow Saints / Starlight

**DEVELOPMENT CANDIDATE - NOT APPROVED FOR DEPLOYMENT OR LIVE ARMING**

Release: `SAGITTARIUS-MW1-R4-ANDROMEDA-AUDIT-2026-10-14`.

This is the complete R3 source application, not a patch-only delivery. It implements the authorized conversion of ordinary Saints to broker-free virtual parents and keeps Starlight Extinction (`Crash Recovery Hunter`) as the sole new capital-executing attack. Existing genuine positions are not converted into shadows.

The current candidate passes isolated regression verification. It has **not** passed native dependency installation, real PostgreSQL migration/concurrency tests, Railway staging/restart, or real broker certification in the delivery environment. The three opt-in PostgreSQL tests remain skipped there. Do not interpret the isolated results as those missing proofs.

## Execution contract

1. Existing qualified ordinary-Saint signals create durable `SHADOW_SAINT` entries in either global mode. The actual registry contains seven ordinary parents: Athena Exclamation, Scarlet Needle, Lightning Plasma, Momentum Hunter, Wave Surfer, Crystal Wall (`Recovery Hunter`), and Sagittarius Justice Arrow.
2. Their virtual entries retain original source/specialist authorization, reference size, mode-appropriate fee assumptions, frozen Aurora/Freezing Coffin and profit-exit contracts.
3. Fresh, coherent, full-position executable evidence is evaluated through the original protection logic in a hermetic virtual journal. No parent broker BUY or SELL is allowed.
4. A negative virtual `hard_stop_loss` commits the parent close, immutable stop proof and Starlight watch/outbox in one scoped PostgreSQL transaction. Threshold contact, partial depth, fabricated JSON and positive P/L do not authorize recovery.
5. Starlight uses its existing independent entry rules and real executable book. A parent stop is an authorization/limit, never an invented current quote or simulated fill price.
6. Starlight retains its own frozen Aurora. Global Freezing Coffin cannot override it. No recursive Starlight-to-Starlight child is permitted.

The main financial open/closed boards and strategy totals contain Starlight only. Virtual parent economics have a separate history/proof view. Genuine account cash and legacy/other-mode real exposure remain distinct and visible.

## Documentation

- `docs/R3-IMPLEMENTATION.md`: connected repair map, safety boundaries and verification limits.
- `docs/R3-MIGRATION-AND-VALIDATION.md`: migration, rollback and required native/staging validation.
- `docs/R3-TEST-CHANGES.md`: reconciliation of all 85 failures reproduced in the supplied R2 baseline.
- `docs/staging-evidence.template.json`: deliberately unapproved staging review template.
- `docs/R2-README-HISTORICAL.md`: original R2 documentation retained for history only. Its release identities, hashes, test claims and deployment statements do **not** certify R3.

The separate delivery evidence archive contains actual isolated TAP logs, source diff, native-install failure, browser checks and file hashes. Temporary dependency import substitutes used for that audit are not installed in this application's `node_modules` and are not included in this application ZIP.

## Local commands and release boundary

`npm run check` performs syntax checks across all source, browser, test and release-tool JavaScript files. It is not an execution/integration test.

`npm test` runs the packaged regression suite. Tests requiring PostgreSQL are opt-in; a default green run with skips is not production approval.

`npm run verify:local` requires explicitly acknowledged disposable PostgreSQL, installs the locked native dependencies, runs syntax checks and three complete native suites on an unchanged source/test/documentation tree, and rejects every skipped, cancelled, todo or failed test. It does not approve production deployment.

`npm run verify:release` additionally requires matching, reviewed isolated Railway SIM evidence and read-only live checks of `/health`, `/ready` and `/api/state`. It verifies log checksums and source identity, not the semantic truth of an operator's statements. No command here deploys, submits a trade, or arms LIVE.

Use the complete environment setup in the validation document. Never point integration tests at the production database. Never bypass the gate with audit import loaders or fabricated staging evidence.

The existing Railway build/start/liveness configuration is retained. A syntax-only Railway build can still be green without release certification. Promotion requires the separate validation gate and explicit operator authorization.

## Source identity

Runtime source fingerprint (`BUILD_INFO.sourceSha256`): `967ff4447c1408c28921b5522089b3c9dab08e17b70300f9cda6c475f2ef141d`.

This hash covers `src/`, `public/`, `package.json`, `package-lock.json`, and `railway.json`, using the existing canonical build-fingerprint algorithm. The delivery manifest and release runner additionally hash tests, scripts and documentation. Test logs are bound to the latter complete-tree fingerprint.

No price bands, stakes, saved operator values, Aurora/Coffin arithmetic, profit targets, market-family exclusions or original Cosmos qualification settings were tuned for this upgrade.
