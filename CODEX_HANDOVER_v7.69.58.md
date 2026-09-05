# Office Card Game - Codex Handover v7.69.58

## Release

- Version: `v7.69.58`
- Base production version: `v7.69.57`
- Scope: First-Session Guidance v1, First Day Goals, one-time guidance persistence, Alpha/Training Loaner clarification, PvP readiness guidance, progression callout, and PostgreSQL first-session mutation hardening.
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.
- Room and matchmaking persistence remain `FILE_JSON_LOCAL`.
- Ranked timer: disabled.

## First-Session Guidance v1

Fresh eligible accounts receive explicit versioned First-Session Guide state with:

- post-Tutorial next-step guidance
- First Day Goals: Tutorial, Training, First Day Deck, and PvP
- First Day Deck ownership/editability guidance
- Alpha Access clarification that test-only cards are not owned
- Training Loaner clarification that cards are Training-only and do not enter Collection
- PvP readiness and correction guidance
- a lightweight Player File progression callout

Hints and goals are persisted and idempotent. Grandfathered legacy accounts do not become
eligible from missing metadata. Guest state remains local/in-memory.

## PostgreSQL mutation hardening

Authenticated First-Session Guide updates use a transactional, row-locked narrow JSONB mutation.
Goal completion, hint dismissal, and milestone event append survive near-concurrent updates without
lost state or duplicate milestones. The client reconciles authoritative state and performs one safe
retry for recoverable persistence collisions; genuine database failures remain diagnosable.

The disposable PostgreSQL 18 integration path and focused concurrency regression passed. No schema
migration was required.

## PvP and analytics QA

Two disposable authenticated seats started a real local PvP match. `pvp_attempted` and `pvp_started`
were each emitted once. First Day Deck ownership passed; Training Loaner and Alpha-only unowned decks
were rejected. Match completion updated history, stats, progression, and the PvP First Day Goal.

First-session milestone events use semantic names and minimal timestamped metadata only. No email,
password, session token, or third-party analytics is used.

## PostgreSQL foundation closeout

The obsolete `ops/postgresql-helper-foundation` branch was reviewed and retired. Its historical final
commit was `0943a06f37e9f7a18470a832c848d621c7d03eb7`; the previously reported `4633bf4c` was current
`main`, not that branch. All six foundation commits were merged, superseded, or historical-only.

`docs/database-operations.md` records that PostgreSQL cutover is complete, authenticated
Account/Profile data is authoritative in PostgreSQL, legacy JSON is historical provenance rather than
the normal rollback source, and future database work uses normal feature/migration branches.

## QA

Build, full tests, direct disposable PostgreSQL integration, disposable PostgreSQL Docker integration,
localization, artwork, cosmetic, security, card-content, and diff checks passed. Browser QA used the
available 1280x720 surface; exact requested mobile/4K viewport emulation was unavailable and remains a
non-blocking tooling limitation.

No schema migration, economy change, account reset, Alpha reset, or production database mutation was
performed. The future Alpha reset remains pending and must deliberately reinitialize guide metadata,
goals, hints, events, and Starter Onboarding state with PostgreSQL as Source of Truth.
