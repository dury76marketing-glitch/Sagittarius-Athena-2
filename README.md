# SAGITTARIUS — Twelve Cosmos / Mega Wave / Game Clock retired

Release: `SAGITTARIUS-COMPLETE-AUDITED-PRODUCTION-GAME-CLOCK-AUTHORITY-REMOVED-2026-09-20`

Package version: `3.3.2`

## Current executable chain

```
CI1 crash
→ Crystal Wall Proof 1…N (operator 1–5)
→ proof certificate
→ Athena Exclamation own crash / rebound / ticks
→ Andromeda + book / spread / band / cap
→ full configured size
→ SIM or LIVE fill
→ Infinity Break / Aurora
→ close
→ historical timestamps and proof IDs
```

Game Clock is **historical telemetry only**. It does not grant or deny trades. A candidate at 4, 95, 177, or 200 minutes is not blocked by minutes.

Closed, settled, or FINAL markets still cannot trade.

## Full configured size

Athena (and other full-size attacks) still require the entire configured contract count. Partial depth is blocked. The rejection reason now names the **actual attack**:

- Athena → `athena_full_configured_size_unavailable`
- Scarlet Needle → `scarlet_needle_full_configured_size_unavailable`
- Justice Arrow → `justice_arrow_full_configured_size_unavailable`

Scarlet is no longer the fallback label for Athena.

## Event Clock

Event Clock records remain as timeline telemetry. Diagnostics report:

- `eventClockTradingAuthority = false`
- `eventClockRole = HISTORICAL_TELEMETRY_ONLY`
- `executableAuthority = false` on every diagnostic record

Reset epoch identifies the cohort. It does not grant execution authority.

## SIM vs LIVE health

SIMULATION is HEALTHY when scanner + protection + Golden Eye are fresh. Stale private REST/WebSocket no longer keeps the SIM banner DEGRADED for hours. LIVE still requires restOk + websocketFresh + reconciliationOk before arming.

## What this ZIP is

This is the complete application tree for Railway:

- `src/`
- `public/`
- `tests/`
- `package.json` / `package-lock.json`
- `railway.json`

Start: `npm start`  
Gate: `npm test && npm run check`

Simulation-validated. Not LIVE-certified until a live cohort is scored after this deploy.
