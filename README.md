# SAGITTARIUS — Crystal Wall Follow Scoreboard + PRI Floor Repair

Release: `SAGITTARIUS-OS1-MADRID-SESSION-GAME-CLOCK-GATE-2026-09-23`

R3: Atomic Thunder reports market-family exclusion instead of a false band miss. A card-ready fire that does not open is recorded as EXECUTION_BLOCKED. Operator 60-69 bands and Andromeda MID are unchanged.

Package version: `3.3.2`

Crystal Wall is no longer a bolt opener. After a real attack closes on Infinity with a win, Crystal Wall may enter the same ticker using its own crash/rebound/ticks and PRI trail. Excalibur copies that Crystal Wall fill across free cosmosses. Scarlet Needle is a regular Bolt Direct attack and uses the shared Infinity target.

Excalibur ON still copies a Bolt Direct source attack once into every free cosmos (12 seats).

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
