# Office Card Game v7.69.76

## Release

**Matchmaking commit-time deck / ownership revalidation — Internal Maintenance**

v7.69.76 preserves the immutable queued-deck snapshot contract and closes F06 at the matchmaking commit boundary. Broader External Alpha remains **NO**. Alpha reset was not performed.

## F06 correctness

- Enqueue-time validation remains in place.
- Each queued ticket carries the exact `{ id, name, cards }` snapshot accepted at enqueue; later saved-deck edits, deletion, or selected-deck changes never silently substitute another deck.
- Immediately before room creation, authenticated participants are re-read from PostgreSQL under deterministic sorted row locks. The exact queued snapshots are validated against current format, copy limits, Standard/Executive ownership, Alpha Access rules, PvP eligibility, and Training-loaner exclusion.
- The validated deck objects are the same payloads passed to `RoomService`; no validate-one/play-another path remains.
- A stale ticket becomes terminal `INVALID` with `DECK_STALE`, is removed from matchability, and requires explicit requeue. Stale opponent candidates are skipped so they cannot poison the queue. Automatic requeue is not performed.
- Profile/database read failures are retryable `PROFILE_UNAVAILABLE` outcomes; cached ownership is never used to create a room.
- PostgreSQL profile locks are held through validation, room construction, ticket marking, and commit. This gives a linearization point against scrapping, crafting, deck edits, and deck deletion. The disposable race regression confirms that a scrap winning the race prevents room creation; a commit winning uses ownership valid at that point.
- Room and Matchmaking remain `FILE_JSON_LOCAL`; Account/Profile remains PostgreSQL. Because these stores are not one transaction, an exceptional file-write/DB-commit failure could theoretically leave a valid orphan room. That residual cross-store risk is separate from stale-ownership correctness and is not expanded here.

## Regressions

Disposable PostgreSQL 18 HTTP coverage confirms the audit reproduction: after Account A scraps a required card, A is invalidated as `INVALID/DECK_STALE`, no room using the invalid deck exists, and B remains safe. A normal valid two-account Ranked pairing creates one room with the exact validated decks and settles once. Executive variant ownership, Alpha Access versus owned copies, Training-loaner exclusion, stale-ticket restart persistence, multiple candidates, both-stale candidates, and profile-read failure behavior remain covered.

F01, F02, F03, and F09 remain resolved. F03 malformed-intent validation and F06 matchmaking never bypass one another. Economy/scrap, Promotion/handEligibility, and existing settlement tests remain green.

## Database and version

- No schema migration is included; production remains migrations **2/2, current/exact**.
- Ranked timer remains `timerActive:false`.
- Application version owners are synchronized to **7.69.76**. Independent schema/content/export versions were not changed.
- Historical rooms, ratings, histories, and rewards were not backfilled or replayed.

## Operations

- Manual backup helper: succeeded at 2026-09-08T11:36:50Z; dump path `/srv/office-card-game/backups/postgresql/office_card_game-20260908T113650.292055771Z.dump`, size 44,414 bytes. Backup status reported a ready directory and 30-day retention.
- Scheduled PostgreSQL backup/restore drill **F04 remains OPEN** because root-dependent diagnosis and restore testing are still unavailable; scheduled backup health is not claimed.
- F05 deployment-lock ordering, F07 ticket expiry, and F12 installed/repository wrapper parity remain open. The installed wrapper checksum used for this release is `0f0f159cac08f911e91f159dc778d85e786f01c5501e13625df571b832555edd`; it was used unchanged.
- Deployment was performed serially by one operator after read-only process inspection; no overlapping preflight/deploy was run.
- Impeccable was not updated; no executable detector was available in this environment.

## QA record

- `npm ci --offline --no-audit --no-fund`: PASS (argon2 allow-scripts warning only).
- `npm run build`: PASS.
- `npm test`: PASS, including the F06 default-chain regression.
- Dedicated F06 regression: PASS (`2/2`).
- `npm run test:db:docker`: PASS; migrations/auth/profile persistence, F01/F02/F09 settlement, F06 HTTP/PG stale-ownership and valid-match paths passed.
- Direct DB: `Direct DB unavailable — OCG_TEST_DATABASE_URL unset.`
- Browser consolidation: blocked by the known Windows `spawn EPERM` harness limitation; no broad frontend changes were made.
- i18n, artwork (107/107), cosmetics, security (0 vulnerabilities), card-content (107/107), Node syntax, and diff checks: PASS.
- Local development ran Node 24.19.0; deployment preflight/full tests provide the authoritative Node 22.22.1 compatibility check.

## Alpha status and next work

Controlled Internal Alpha may continue after successful deployment. Broader External Alpha remains **NO**. Do not perform Alpha reset from this release.

Recommended follow-up ordering: F05 deployment lock ordering, F12 wrapper parity reconciliation, then F07 matchmaking ticket expiry. Root-dependent operational work remains F04 backup diagnosis and an isolated restore drill.
