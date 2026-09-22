# SAGITTARIUS — Bolt Direct R3 Excalibur 12 + Closed Table 500

Release: `SAGITTARIUS-BOLT-DIRECT-R3-CLOSED-TABLE-500-2026-09-22`

Package version: `3.3.2`

Excalibur ON: one bolt + one enabled attack opens that attack once in every cosmos (12 seats). The source room fires; the other eleven rooms copy immediately. Same cosmos + same attack + same ticker stays locked.

## Current executable chain

```
Feeder shadow
→ GREEN
→ Atomic Thunder Bolt (5s timing ticket)
→ enabled attack own band / crash / rebound / ticks
→ Andromeda + book / spread / cap
→ full configured size
→ SIM or LIVE fill
→ Infinity Break / Aurora
→ close
```

Crystal Wall proofs are paper only. They do not authorize Athena.
Athena is an optional attack, not a grant source.
Galactic Explosion OFF = one ticker one hunter.
Galactic Explosion ON = each enabled attack may join that ticker (one seat per attack).

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

Homepage closed-trades table shows the latest 500 executable rows in the existing scroll box. Backend OPI1 already fetched 500; only the UI slice was still 30.

Simulation-validated. Not LIVE-certified until a live cohort is scored after this deploy.
