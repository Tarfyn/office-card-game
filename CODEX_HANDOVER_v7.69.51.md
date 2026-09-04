# Office Card Game - Codex Handover v7.69.51 Account/PostgreSQL Candidate

## Release

- Version: `v7.69.51` candidate (not tagged, merged, deployed, or cut over)
- Base: current `main` v7.69.50 (`15f64b7d055a1b1d1b99be501a71d709e7913088`)
- Ranked timer: disabled
- Server authority: deck ownership, Match state, progression, rewards and cosmetic ownership remain authoritative

## Training deck readiness

Training and Tutorial now validate the currently selected player deck in the Lobby before
starting. Format readiness and owned-copy readiness remain separate checks; invalid decks disable
only the Bot-match actions and show one localized reason. Changing the player deck clears the old
validation message and recomputes readiness immediately, so a valid custom 40-card deck can start
without reloading the Lobby. The Bot deck remains an independent preset selection and never
overwrites the player deck.

The server already resolves the saved player deck through the profile and validates ownership
authoritatively. No ownership rules or gameplay rules changed in this pass.

## Achievement Overview

The Player File Overview now shows three meaningful incomplete Achievement milestones with their
localized names and current progress. The Achievements tab also names incomplete rows instead of
showing only a generic `In progress` label. Achievement progression and rewards are unchanged.

## Ranked and Player File presentation

Stable season identifiers remain in state, but the Player File header, Ranked section and Lobby
standing use localized presentation labels. `ALPHA_PRESEASON` is shown as `Alpha Preseason` in
English and `Alpha-Vorsaison` in German. The responsive dossier uses a two-column mobile summary
with the Record card spanning the row, wraps long identity/history metadata, keeps 44px tab
targets, and centers the active tab within the horizontal strip without page-wide overflow.
Footer actions retain the dossier surface with readable contrast on narrow screens.

## Localization and QA

Long localized labels use wrapping and minimum-width protections rather than unreadably small
fallback fonts. The current-main Lobby and Account/Operations additions were checked in the real
local browser at 390x844, 844x390, 1920x1080, and 3840x2160. Account focus management, password
visibility controls, PostgreSQL identity state, Operations status, touch reachability, horizontal
overflow, and browser console errors were verified. The disposable PostgreSQL 18.6 browser run
reported READY with current migrations and was removed afterward.

## Preserved systems

Combat correctness, Resolve notification hosting, Silver frame masking, Match HUD Badge and Title
coexistence, Match-end presentation timing, Card Backs, Match History, recovery hardening,
Achievements, Ranked progression, Executive Edition, phase auto-advance, Board rendering,
Company Store, Personnel File, Deckbuilder, Training gameplay and Tutorial gameplay remain
unchanged. Deployment hardening remains active, including audit-independent install, bounded
installation, locking, immutable release validation, readiness/health checks and rollback safety.

## Account and PostgreSQL persistence candidate

This branch reconciles the accepted Account application, PostgreSQL helper, migration, backup, and
deployment-hardening foundations onto v7.69.50. `PROFILE_STORAGE_BACKEND` is explicit:
`FILE_JSON_LOCAL` keeps Guest player state authoritative; `POSTGRES` enables Account registration,
login, logout, opaque cookie sessions, and PostgreSQL-backed player profiles. Merely configuring
`DATABASE_URL` never changes the backend. Hosted Room, Matchmaking, and playtest-feedback snapshots
remain JSON-backed in this first cutover.

Email lookup trims and lowercases addresses. Passwords use Argon2id (64 MiB, three iterations, one
lane), with two concurrent hashing jobs and a bounded queue of 20. The 30-day Account cookie is
`HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in network mode; PostgreSQL stores only SHA-256
session-token hashes. Authenticated JSON mutations enforce same-origin Origin/Referer checks in
network mode. Registration is limited to 5 attempts per IP per 15 minutes and login to 10 per IP per
10 minutes. Email verification, password reset, social login, and account linking remain future work.

Authenticated profile operations derive ownership exclusively from the server-side session.
PostgreSQL stores the normalized canonical profile JSONB plus transactional Deck, RewardGrant, and
Achievement projections. Profile-row locks serialize economy/profile mutations, and two-profile
Ranked settlement locks UUIDs in stable order. Stable Deck IDs and revisions, `DECK_CONFLICT`,
RewardGrant sourceRef idempotency, Cosmetics/Loadout, Cards, currencies, Achievements, Ranked, and
Alpha grants retain existing game-domain semantics.

Guest mode remains a separate temporary testing path. Under `POSTGRES`, Guest identity is
memory-only and does not read or write archived legacy profile JSON. Registering always starts a
fresh default Account profile. The Alpha reset intentionally does not claim or migrate old Guest
progress; the fixed helper backs up and preserves legacy files before cutover.

Versioned additive migrations live in `db/migrations`. The runner validates ordered filenames and
SHA-256 checksums, serializes runners with a PostgreSQL advisory lock, and applies each migration in
a transaction. Missing or changed required migrations fail closed. `/api/ready` requires database
reachability, compatible migrations, and the core schema whenever `POSTGRES` is selected; there is
no silent fallback to file persistence.

The repository-managed deployment wrapper builds/tests, installs and verifies production `argon2`
and `pg` dependencies, prepares and finalizes an immutable release, validates the exact
`deploy/postgres-persistence-ready` marker, and invokes
`sudo -n /usr/local/sbin/ocg-db-helper migrate <validated-release>` before activation. Migration
failure blocks activation and discards only the inactive release prepared by that failed attempt.
Service verification uses active state plus a positive MainPID and bounded version/readiness endpoint
checks; it does not inspect another user's `/proc/<pid>/cwd`. Bounded activation and rollback loops
tolerate transient proxy/upstream failures. The wrapper never calls `enable-postgres`; backend
cutover remains a separate explicit operator action.

The accepted DB helper targets PostgreSQL 18, loopback/Unix-socket-only access, fixed
`office_card_game` / `office_card_game_app` resources, protected legacy and PostgreSQL backup paths,
30-day dump retention, exact release-name validation, and the single constrained sudoers rule. The
application receives no root or sudo access.

## Operations Cockpit

`/ops` and `/api/ops/*` require a PostgreSQL Account role of `OPS` or `ADMIN`: no session returns 401,
`PLAYER` returns 403, and approved operator roles return read-only safe status. The contract exposes
application/backend/readiness/migration/account/profile/cutover and bounded diagnostic metadata but
never URLs, passwords, tokens, raw environment values, arbitrary filesystem paths, SQL, shell,
helper execution, restore, deployment, or game mutations. Privileged backup/timer facts are shown
only when safe persisted metadata is available; otherwise they remain unavailable.

The initial role bootstrap is the non-public CLI
`scripts/account-role.mjs grant-ops|grant-admin <email>`. It requires an existing active PLAYER
Account, accepts only the fixed OPS/ADMIN transitions, and uses parameterized SQL. It accepts no
generic role, SQL, path, or secret argument and has no registration or web equivalent.

## Cutover and rollback constraints

The marker identifies a technically reviewed PostgreSQL-capable release, not an active production
cutover. Before approval, production remains `FILE_JSON_LOCAL`. The operator sequence is: verify
installed artifacts and loopback-only PostgreSQL; take fresh legacy and PostgreSQL backups; deploy
the tag so the immutable candidate is migrated before activation; verify it while file persistence
is still active; separately run `enable-postgres`; then reactivate that exact migrated release and
perform DB-backed readiness, Account, cross-session, Ops, backup, and external port-exposure checks.

Migrations are additive and forward-only. Before `enable-postgres`, rollback can reactivate the
previous file-backed release. After cutover, new Account data is authoritative in PostgreSQL, so
blindly reverting to stale JSON is forbidden; rollback must use a schema-compatible application
release or a separate human-reviewed recovery plan. No production migration, enablement, tag,
deployment, or VPS change is part of preparing this branch.
