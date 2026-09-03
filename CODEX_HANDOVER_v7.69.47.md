# Office Card Game - Codex Handover v7.69.47

## Current baseline

- Version: `v7.69.47` release candidate
- Release commit: the final commit on `codex/release-v7.69.47-account-postgres`; no production tag exists yet
- Ranked timer: disabled
- Server authority: hosted Match state, profile persistence, ownership, rewards and progression remain authoritative

This release adds the Account, PostgreSQL persistence, and protected Operations foundation on top
of the v7.69.46 recovery-hardening baseline. Production remains `FILE_JSON_LOCAL` until the separate
explicit cutover, while `POSTGRES` mode provides the reviewed authenticated source of truth. The
release contains the required `argon2` and `pg` runtime dependencies; PostgreSQL reachability is
required for readiness only when the PostgreSQL backend is selected.

## Player File meta hub

The Player File is the local player's profile/progression hub, separate from the Personnel File,
which remains the owned cosmetics and loadout surface. The Player File contains:

- Overview: equipped identity, level/XP, rank/season, record, recent form and favorites
- Match History: retained authoritative Match summaries with filters and an initial 20-record slice
- Ranked: season, placement state, rating, rank/division and ranked record
- Achievements: completion/progress summary and recent completions
- Stats: competitive, ranked, training/tutorial and department/deck usage summaries

The header projects the existing `CosmeticLoadout` identity (Avatar, Frame, Badge and Title when
equipped), level/XP and current Rank without exposing internal IDs or private account data. Empty
optional cosmetic slots are omitted cleanly. English is canonical and the surface is localized in
German through the existing localization layer.

## Match History model

`MatchHistoryRecord` is an explicit portable domain model in `src/match-history.ts`. It stores the
authoritative summary needed by the UI, not a replay or hidden game state:

```text
roomId / matchId
completedAt, mode, result, playerSeat
opponentName
selectedDeckId, deckName, primaryDepartment
opponentDeckName / opponentDepartment only when public and available
turns, durationMs, playerFinalRep, opponentFinalRep
ratingBefore, ratingAfter, ratingDelta, rankBefore, rankAfter, seasonId
rewardEligible, completionReason
```

The server writes records from the authoritative room completion hook. A completion is recorded
exactly once using `matchId`/`roomId` identity, so reopening a result, resyncing or repeating an
intent cannot duplicate history or counters. Existing profiles normalize safely to empty history.

History retention is centralized at **100 newest records per player**. The UI renders 20 initially
and can load more without rendering the full retained set at once. Timestamps are stored in stable
server form and localized when displayed. No hidden opponent hand, private token, session ID or
hidden Deck contents are stored or exposed.

## PlayerStats and mode separation

`PlayerStats` is persisted beside the profile and maintains explicit aggregate tallies for PvP,
Ranked, Training and Tutorial. Competitive W/L/D and win rate exclude Training and Tutorial.
Ranked counters maintain current/peak MMR and rank snapshots. Total turns, deck usage, primary
Department usage and most-played Deck are updated from authoritative completion data where reliable.
Historical Deck names remain snapshots so records stay understandable after a Deck rename or delete.

Training and Tutorial can appear in history with their own mode labels, but do not affect PvP stats,
Ranked MMR, Ranked records or normal progression/reward eligibility. Friendly/Quick Match and
Ranked are the default competitive perspective. Department statistics use the existing deterministic
primary-Department derivation and report `MIXED` for ties where applicable.

## Existing Match and board baseline

The Match Board remains full-width on desktop with a permanent `3.25deg` desktop World Layer
perspective and flat screen-space overlays. Mobile portrait and landscape remain Top View. Own and
Opponent use one canonical halfboard geometry with matching pre-perspective slot center-X values;
cards retain canonical 5:7 anatomy.

The phase divider remains `START | DRAW | MAIN | BATTLE | END`. Safe hosted matches auto-advance
START, DRAW and END only when no authoritative choice, target, response, trigger, chain or hand-limit
interaction is pending. MAIN and BATTLE remain player-controlled. The divider uses green local-turn
and restrained red opponent-turn active states with localized non-color cues. Ranked timer enforcement
remains disabled.

Normal Match target selection remains board-native and non-modal. Local pre-commit target selection
supports Cancel/Esc where legal, while mandatory server Choices remain non-cancellable. Archive
targets remain accessible. Tutorial uses the real engine, explicit TUTORIAL mode and
`rewardEligible:false`; its guided phase progression can suppress normal auto-advance. Training and
Bot use the same hosted authoritative Match path with `rewardEligible:false`.

## Decks, cards and progression foundations

Player Decks are persistent profile records with stable IDs, revisions, migration fingerprints and
server validation. Selected Deck state is server-side. Browser-local Decks migrate idempotently and
remain only as migration marker/draft recovery/cache after synchronization. Invalid saved Decks stay
editable, while invalid Decks cannot enter production Match or Training. Recycling warns before
making saved Decks invalid; crafting/acquiring missing copies can restore validity. Starter Decks
remain global definitions and Tutorial keeps its fixed Deck architecture.

Executive Edition is a presentation-only card variant with `finish: EXECUTIVE` and IDs of the form
`<BASE_CARD_ID>-EXEC`; gameplay resolves from `baseCardId`. Standard and Executive copies share the
base copy limit, ownership is separate, and Executive variants are not craftable. The finish uses
the accepted gold material and artwork-focused spectral foil through all card surfaces. The current
Alpha grant, reward-only Executive Edition Pack, provisional booster chance and local
`OCG_ALPHA_QA_EXECUTIVE=1` deterministic Training hook remain test infrastructure.

Achievements and Ranked progression are server-authoritative and data-driven. Achievement definitions
are in `data/achievements.json`; Ranked ranks/seasons are in `data/ranked/`. Rewards use the existing
idempotent RewardGrant path. Alpha Ranked frame grants are separate temporary test availability and
do not make reward-only Ranked frames shop-listed or normal starter cosmetics.

## Cosmetics

`CosmeticLoadout` remains independent by stable IDs for board, avatar, frame, decoration, card back,
badge and title. Personnel File shows owned cosmetics only; Company Store shows shop availability
independently. COS-AVA-001/002 are starter-owned; COS-AVA-003..006 are shop-only. Ranked frames
COS-FRAME-003/004/005/006 are absent from Company Store and are Alpha-owned only through explicit
idempotent playtest grants until real Ranked reward acquisition is active.

Avatar frames reach the outer avatar perimeter and replace the normal border. The shared avatar
composition masks portraits to the frame's inner opening using build-time alpha flood-fill-derived
RGBA masks, with an explicit Silver override for ambiguous circular geometry. The same renderer is
used by Personnel File, Lobby identity and Match HUD; portrait pixels must not protrude through
exterior transparency or below the frame opening.

## Economy and known limitations

Current provisional/test economy values remain unchanged: T0 recycle/craft `10/150`, T1 `25/300`,
T2 `60/600`, T3 `150/1200`; Alpha Booster `100 Office Credits / 5 cards`. Training and Tutorial
remain reward-ineligible.

Known gaps for future work:

1. There is no Match replay viewer.
2. Public profiles and player lookup are not implemented.
3. Matches completed before this feature are not reconstructed.
4. The favorite Deck summary has no direct Open Deck shortcut yet.
5. Guest play remains browser-local; authenticated Accounts provide the cross-device identity path.
6. Unsaved Deckbuilder drafts remain recoverable only on the originating browser.
7. Tutorial guidance and Bot/Training quality still benefit from live polish/playtesting.
8. Desktop perspective and neutral board art may still be tuned after live testing; perspective is client-rendered.

The current Player File models are portable typed domain structures suitable for a later persistence
adapter. Do not create a parallel profile store or modify database/helper infrastructure as part of
ordinary feature work.

## Match Recovery and Reconnect

Hosted Matches use persisted `RoomService` snapshots with seat/token identity, authoritative phase,
priority, pending Choice/target/response state, processed-intent idempotency, rematch state and
completion data. SSE is the preferred live transport; bounded reconnect backoff and HTTP polling
fallback resynchronize the same room after reload, visibility changes or a short network failure.
Local process restart restores active JSON-backed rooms, while live connections are re-established
as disconnected until clients reconnect. Server presence remains the existing connected/disconnected
signal; disconnect grace support is configured but disabled, and no transient disconnect awards a win
or applies Ranked penalties.

The client distinguishes `LIVE`, `RECONNECTING`, `POLLING`, `OFFLINE`, `RECOVERED` and `SUPERSEDED`.
Reconnect notices are compact, non-blocking and debounced by approximately 800ms. Successful
resynchronization briefly presents the localized `RECOVERED` state before returning to `LIVE`.
Historical event tails hydrate the event log without replaying transient Combat Overlay, movement or
impact cues. A second tab may observe the room but is read-only until it explicitly takes controller
ownership; duplicate intents remain server-idempotent. Pending server interactions restore from the
authoritative view, while purely local uncommitted selections may reset safely.

Browser QA coverage for this release verified MAIN/BATTLE reload, server interruption and restore,
debounced recovery notice, process-restart room restore, compact UI and two-tab takeover. The
available browser session did not provide exact viewport emulation, console-log access, a reproducible
pending-Choice fixture, a safely reachable result-screen reload, or true mobile backgrounding; these
remain documented QA coverage gaps rather than confirmed runtime defects. Future durable
DB-backed Match recovery remains separate from the current JSON Room persistence and must not be
implemented by ordinary feature work.

## QA baseline

The release QA matrix is 1920x1080, 3840x2160, 390x844 and 844x390. Check profile sections,
localized labels, empty/populated history, filters, framed identity, no horizontal overflow and no
browser console errors. Required automated checks remain build, full test suite, localization audit,
artwork audit, diff check, `/api/ready`, `/api/health`, and Ranked timer disabled.

## Account and PostgreSQL persistence candidate

The release-candidate branch adds the first-party Account foundation as version 7.69.47 without
changing production state. `PROFILE_STORAGE_BACKEND` is explicit:
`FILE_JSON_LOCAL` keeps Guest player state authoritative; `POSTGRES` enables Account registration,
login, logout, opaque cookie sessions, and PostgreSQL-backed player profiles. `DATABASE_URL` alone
never changes the backend. The accepted root helper writes `POSTGRESQL`, which the application
normalizes to the same internal `POSTGRES` state. Existing hosted Room, Matchmaking, and
playtest-feedback operational snapshots remain JSON-backed in this first cutover.

Email lookup trims and lowercases addresses. Passwords are Argon2id hashes (64 MiB, three
iterations, one lane), with two concurrent password jobs and a bounded queue of 20 to protect the
Alpha server from trivial memory exhaustion. Account cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, 30-day, and
`Secure` in network mode; only SHA-256 token hashes are stored. Authenticated writes require JSON
and same-origin Origin/Referer validation in network mode. Register is limited to 5 attempts per IP
per 15 minutes and login to 10 per IP per 10 minutes. Email verification, password reset, social
login, and account linking are intentionally not implemented yet.

Authenticated profile reads and mutations derive ownership only from the server session. PostgreSQL
stores the canonical normalized profile JSONB and transactional Deck, RewardGrant, and Achievement
projections. A locked profile row serializes economy and profile mutations across devices/processes;
two-profile Ranked settlement locks UUIDs in stable order. Stable Deck IDs, revisions,
`DECK_CONFLICT`, RewardGrant sourceRef idempotency, Cosmetics/Loadout, collection, currencies,
Achievements, Ranked, history, and Alpha grants retain the current domain service semantics.

Guest mode remains an explicitly temporary testing path. In `POSTGRES` mode its server identity is
memory-only and can be re-seeded from browser state, so archived legacy player/credential JSON is
not read or written. Creating an Account always starts a fresh default profile. Old Alpha Guest
Cards, Decks, Cosmetics, currencies, Achievements, Ranked data, and Rewards are intentionally not
migrated or claimed. Legacy files are backed up and retained, not deleted.

Migrations live in `db/migrations` and run only through `scripts/db-migrate.mjs`: filenames and
checksums are validated, one advisory lock serializes runners, and each migration is transactional.
Missing or checksum-changed required migrations fail closed. Additional migration records from a
newer release remain visible but are accepted as forward-compatible under the mandatory additive
migration contract, allowing code rollback. `/api/ready` requires reachability, compatible current
migrations, and core schema when `POSTGRES` is selected. The root-owned helper performs pre/post
dumps and refuses activation when migration or marker validation fails. Migrations are additive/
forward-only; code rollback cannot automatically undo schema.

The dedicated `/ops` route and every `/api/ops/*` endpoint require a DB-backed Account role of
`OPS` or `ADMIN` (401 without a session, 403 for `PLAYER`). Phase 1 is read-only and exposes only
safe structured System, Persistence, Database, Backup, Cutover, Account, bounded recent-profile,
Progression, and diagnostic status. It provides no SQL, shell, sudo, helper, restore, migration,
deploy, role, or game-state
mutation capability. Root-only backup/timer details remain `UNAVAILABLE`; the application receives
no elevated OS privilege. Future admin mutations require a WHO/WHEN/ACTION/TARGET/BEFORE/AFTER/
REASON audit log first.
The first reviewed operator/admin is designated only by the human-root-run
`scripts/account-role.mjs grant-ops|grant-admin <email>` CLI; it accepts no generic role, SQL, path,
or credential argument and has no web equivalent.

The candidate now includes the exact `deploy/postgres-persistence-ready` capability marker and the
repository-managed `ops/office-card-game-deploy.sh`. The deploy artifact packages production
`argon2`/`pg` dependencies and runs `ocg-db-helper migrate <validated-release>` after finalization
but before activation. Migration failure leaves the previous release active. Installing that deploy
artifact on the VPS remains a human-controlled pre-cutover requirement.

Before cutover, run `npm run test:db` with a disposable `office_card_game_test*` database, perform
two-browser same-Account persistence QA, and complete 1920×1080, 3840×2160, 390×844, and 844×390
visual checks. Do not call `enable-postgres`, migrate production, tag, merge, or deploy until those
gates pass and explicit approval is given.
