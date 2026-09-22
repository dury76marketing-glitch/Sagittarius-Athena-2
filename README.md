# SAGITTARIUS — Bolt Direct R4 Excalibur All-Attacks 12

Release: `SAGITTARIUS-BOLT-DIRECT-R4-EXCALIBUR-ALL-ATTACKS-12-2026-09-22`

Package version: `3.3.2`

Excalibur ON: one bolt + one enabled attack opens that attack once in every cosmos (12 seats). This applies to Athena, Scarlet, Justice, Wave, Horn, Plasma and every other Bolt Direct attack — not Athena only.

## What R4 repairs

Production logs showed Athena copying to 12 rooms while Scarlet stopped at 7 on the same Excalibur grant. Two connected defects caused it:

1. Replica rooms re-checked the live entry band. After the first seats filled at 69c, the book left 60–70 and the remaining rooms died on `entry_band`.
2. The in-memory commit lock was `commit:TICKER` for the whole process. Twelve rooms stampeded the same lock; losers returned `hunter_entry_commit_lock_busy` instead of opening.

R4 keeps the source-room band check. Excalibur copies inherit the authorized fire and no longer re-veto live band / strike cap. The commit lock is ticker + attack + cosmos when Excalibur, Rozan or Galactic is ON.

## Current executable chain

```
Feeder shadow
→ GREEN
→ Atomic Thunder Bolt (5s timing ticket)
→ enabled attack own band / crash / rebound / ticks (source seat only)
→ Excalibur copies the same attack onto every other free cosmos
→ Andromeda + book / spread / cap
→ full configured size
→ SIM or LIVE fill
→ Infinity Break / Aurora
→ close
```

Game Clock remains historical telemetry only.
