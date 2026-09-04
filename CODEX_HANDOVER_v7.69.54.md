# Office Card Game - Codex Handover v7.69.54 Legacy Starter Onboarding Visibility Hotfix

## Release

- Version: `v7.69.54`
- Base production version: `v7.69.53`
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.
- Room and matchmaking persistence remain `FILE_JSON_LOCAL`.
- Ranked timer: disabled.

## Legacy account visibility hotfix

Starter Onboarding v1 is now required only when the authoritative profile contains an
explicit v1 marker with status `PENDING` or `IN_PROGRESS`. Explicit `COMPLETE` profiles
continue directly to the normal Lobby.

Authenticated PostgreSQL profiles from before Starter Onboarding may have no onboarding
metadata. The server projects those legacy profiles as transiently complete for response
normalization without writing a synthetic marker or changing the stored profile. Missing
metadata is never inferred to mean a fresh account.

Fresh profile initialization remains explicit: new accounts receive `PENDING` through the
existing initialization path, and the existing Department, eight-booster, First Day Deck,
resume, idempotency, Alpha access, Training Loaner, Bot Loaner, and PvP ownership semantics
are unchanged. The future Alpha reset is not performed by this release.

The client modal visibility rule is equally explicit and renders only for `PENDING` or
`IN_PROGRESS`; it does not use the legacy-unsafe `status !== COMPLETE` inference. Existing
authoritative error reconciliation remains in place so completed or not-applicable requests
refresh profile state and leave the Lobby usable.

## QA and compatibility

The PostgreSQL integration suite verifies migrations, authenticated persistence, restart,
authorization, concurrency, the complete starter grant path, and idempotency. Disposable
local browser fixtures covered a legacy account opening and reloading the Lobby without the
modal, a fresh account completing Department selection and all eight boosters, an in-progress
resume, a completed account, and English/German presentation. No production account was
reset or mutated.

The release preserves Player File, Match History, Achievements, Ranked progression, Cosmetics,
Card Backs, Badges, Avatar Frames, Executive Edition, combat and recovery hardening, phase
auto-advance, Company Store, Deckbuilder, Training/Tutorial behavior, and deployment hardening.

The parked branch `ops/postgresql-helper-foundation` remains separate and unchanged.
