# Office Card Game - Codex Handover v7.69.55 Alpha Feedback Readiness

## Release

- Version: `v7.69.55`
- Base production version: `v7.69.54`
- This release is the focused Alpha Feedback Readiness pass.
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.
- Room and matchmaking persistence remain `FILE_JSON_LOCAL`.
- Ranked timer: disabled.

## Alpha Feedback Readiness

The first-session journey now explains the onboarding completion and the next action. The
generated First Day Deck is identified as the player's owned, editable, normal Player Deck and
is presented as PvP-ready when its server validation is otherwise legal. Reload/resume remains
authoritative and the completion notice is session-local, so it does not create a modal loop or
duplicate grant.

Training Loaners remain unchanged mechanically. The Lobby and Training surfaces now state that a
loaner is temporary, usable without ownership, not added to the Collection, Training-only, and
unavailable for normal PvP. Owned Collection and All Alpha Cards remain distinct; Alpha-access
cards are marked `ALPHA ACCESS · NOT OWNED` in English and German and remain unavailable for
ownership-dependent PvP/economy actions.

Existing Alpha/QA credit faucets remain functionally unchanged. Their values and repeatability
were not altered; presentation makes their Alpha/QA-only status explicit. No economy balance,
progression math, schema, or account reset changed.

Player File achievement counting now uses the loaded achievement projection correctly. Relevant
Player File, Personnel File, Company Store, Collection, and Lobby surfaces reset scroll position
appropriately when opened on mobile.

## Health and observability

`/api/health` keeps all existing compatibility fields and adds explicit persistence terminology:

- `accountPersistence`: `POSTGRES` for authenticated Account/Profile persistence
- `guestPersistence`: `MEMORY_ONLY` in production
- `roomPersistence`: `FILE_JSON_LOCAL`
- `matchmakingPersistence`: `FILE_JSON_LOCAL`

Readiness semantics, database-required/READY behavior, and `timerActive:false` are unchanged.

## Readability and feedback

This release preserves semantic contrast tokens and targeted dark-surface/readability fixes. It
does not attempt a global Legacy CSS rewrite; remaining lower-priority contrast debt is tracked
for follow-up. The internal feedback guide is [docs/alpha-feedback-checklist.md](docs/alpha-feedback-checklist.md).

The Training Bot remains a follow-up observation item; no AI rewrite was made. A future
destructive Alpha reset remains planned but was not performed. Before any future mutating
Operations/Admin endpoint is added, an attributable Admin Audit Log is required. Backup/helper
state remains outside the web application unless safe persisted metadata is available.

## QA

The release was checked with the build, full regression suite, PostgreSQL integration and Docker
PostgreSQL tests, i18n/artwork/cosmetic/security/DB static audits, diff validation, and browser
review at 390x844, 844x390, 1920x1080, and 3840x2160 in English and German. Authenticated
PostgreSQL and `FILE_JSON_LOCAL` paths were both exercised; no production account or persistence
state was reset.
