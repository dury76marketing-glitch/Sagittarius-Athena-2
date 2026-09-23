# SAGITTARIUS — Starlight Extinction stop-loss re-entry repair

Release: `SAGITTARIUS-SE1-R2-STOP-LOSS-NOTIFY-STARLIGHT-2026-09-23`

Starlight Extinction only re-enters after a same-cosmos executable hunter stop-loss. Hard-stop closes were not notifying Profit Guard, so the watch never armed. SE1-R2 notifies on those closes, keeps the ticker quoted, and honors operator 0/0/0 crash/rebound/ticks.

BOR1-R3 shared-account covered exit is preserved.
