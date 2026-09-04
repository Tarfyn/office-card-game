# Office Card Game - Codex Handover v7.69.53 Starter Onboarding Client Hotfix

## Release

- Version: `v7.69.53`
- Base production version: `v7.69.52`
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Ranked timer: disabled

## Starter Onboarding hotfix

The server remains responsible for the canonical onboarding progression:
`PENDING -> IN_PROGRESS -> Booster 1/8 through 8/8 -> COMPLETE` with exactly one First Day
Deck created at completion. No schema, migration, starter grant, booster, Alpha access,
Training Loaner, PvP ownership, or persistence semantics changed in this release.

The client now maps preserved onboarding error codes to localized presentation copy instead of
rendering internal status/error tokens such as `STARTER_ONBOARDING_COMPLETE`. After a failed
Department or Booster mutation, the client re-reads the authoritative profile and clears stale
onboarding messaging when the server has already advanced to `IN_PROGRESS` or `COMPLETE`.

The unnecessary deck synchronization after Department selection was removed so the fresh server
onboarding response is applied directly and Booster 1/8 is shown without a competing stale
projection. The existing authoritative modal visibility rule remains: incomplete onboarding
renders the modal, while `COMPLETE` renders the normal Lobby.

Repeated Department selection remains idempotent and does not duplicate core grants. Repeated
completion remains idempotent and does not create another First Day Deck.

## Compatibility and QA

The release preserves Player File, Match History, Achievements, Ranked progression, Cosmetics,
Card Backs, Badges, Avatar Frames, Executive Edition, combat and recovery hardening, phase
auto-advance, Company Store, Deckbuilder, Training/Tutorial behavior, and deployment hardening.

The disposable PostgreSQL-backed browser flow verified authenticated registration, Department
selection, Booster 1/8 resume after reload, sequential completion through Booster 8/8, First Day
Deck creation, modal dismissal, German localization, and a post-completion reload with the modal
remaining closed. The database integration suite covers authenticated persistence, restart,
authorization, concurrency, the complete eight-booster path, and idempotency. No production
account was modified.

The parked branch `ops/postgresql-helper-foundation` remains separate and unchanged.
