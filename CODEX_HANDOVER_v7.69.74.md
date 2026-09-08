# Office Card Game v7.69.74

## Settlement Correctness / Internal Maintenance

This release repairs the authenticated match-completion path discovered in the v7.69.73 deep audit. It is an internal maintenance release for controlled internal Alpha testing. It is **not** an External Alpha Candidate and does not approve broader Alpha testing.

### Settlement changes

- F01: fixed the multi-profile PostgreSQL adapter clone callback for Node 22 compatibility.
- F02: added additive migration `db/migrations/0002_match_settlements.sql` with the durable `public.match_settlements` ledger. The canonical identity is the authoritative `matchId`; uniqueness is enforced by the primary settlement identity and `(match_id, settlement_kind)`. This ledger is independent of bounded visible history, recent results, and recent form.
- F09: ended eligible rooms now persist pending profile-completion obligations. Delivery uses bounded exponential retry with a 30-second cap, sanitized failure state, restart reconciliation, and a ledger-backed replay no-op. Ranked participant updates use deterministic profile lock ordering and one PostgreSQL transaction, including profile JSON and normalized projections.
- Repeated room reads, duplicate delivery, concurrent delivery, and reward claims are idempotent. No historical rooms were backfilled or replayed.

### Product and data boundaries

- Ranked rules, tiers, divisions, Diamond behavior, preseason, rewards, and `timerActive:false` are unchanged.
- Friendly completion remains eligible. Tutorial and Training retain their existing reward-ineligible semantics; Guests remain `MEMORY_ONLY / GUEST_LOCAL` and do not receive account settlement.
- Alpha reset was not performed or implemented.
- Existing bounded histories remain bounded. Legacy ended rooms without the new pending marker are deliberately outside automatic replay to avoid speculative historical double settlement.

### Migration and rollback rehearsal

- Candidate disposable PostgreSQL 18 migration result: `0001` + `0002`, `2/2`, `current:true`, `exact:true`.
- v7.69.73 was started against the already-upgraded disposable schema. It returned HTTP 200 `/api/ready` READY with `current:true`, `exact:false`, and `unknown:["0002_match_settlements.sql"]`; `/api/health` returned HTTP 200 healthy. Normal startup/readiness/profile infrastructure remained operational. Automated rollback remains compatible with the additive schema under the existing migration philosophy; no rollback was required.
- Production migration state before deployment: `1/1 current/exact`. Expected after deployment: `2/2 current/exact`.

### Backup and operations

- Authorized manual helper backup was attempted and succeeded before deployment: `/srv/office-card-game/backups/postgresql/office_card_game-20260908T060050.016360805Z.dump`, 41,767 bytes, 2026-09-08 06:00:50Z. Retention is 30 days and helper status reported the path as ready.
- Scheduled `office-card-game-db-backup.service` remains the confirmed F04 P1 OPS issue (timer active, service failed) and is deferred until root diagnosis is available. No restore drill was performed.
- F05 deployment-lock ordering and F12 installed/repository wrapper drift remain open. The installed wrapper checksum recorded before deployment was `0f0f159cac08f911e91f159dc778d85e786f01c5501e13625df571b832555edd`. Deployment is a single serial operator action with no overlapping preflight/deploy process; the installed wrapper is intentionally unchanged.

### QA evidence

- `npm.cmd ci --offline --no-audit --no-fund`: passed (27 packages; npm reported the existing argon2 allow-scripts notice).
- `npm.cmd run build`: passed.
- `npm.cmd test`: passed (all existing suites, 46 Node presentation tests, settlement room regression, account/static and DB static checks).
- `npm run test:db:docker`: passed on disposable PostgreSQL 18 with `DB_INTEGRATION_OK` and `RANKED_SETTLEMENT_HTTP_PG_REGRESSION OK`; this includes two-account HTTP/PG Ranked settlement, duplicate and 101+ replay, concurrency, forced failure/retry, restart reconciliation, reward idempotency, and Friendly coverage.
- Direct DB: `Direct DB unavailable — OCG_TEST_DATABASE_URL unset.`
- i18n, artwork, cosmetics, security, card-content, Node syntax, and diff checks passed.
- `npm run test:browser:consolidation` remains blocked by the existing Windows `spawn EPERM` harness limitation; no frontend files changed in this release. Existing browser acceptance coverage is unchanged.
- Impeccable detector remained degraded because optional parser modules are unavailable (regex fallback, exit 2); no update was made.
- Local development used Node 24.19.0. Production preflight/deployment uses Node 22.22.1; settlement code uses Node 22-compatible APIs (including explicit `structuredClone` callback).

### Release status

- Production persistence remains Account/Profile `POSTGRES`, Guest `MEMORY_ONLY`, Room `FILE_JSON_LOCAL`, Matchmaking `FILE_JSON_LOCAL`.
- The release channel is `INTERNAL_MAINTENANCE`; External Alpha remains **NO**.
- F03 runtime intent validation, F04 backup service diagnosis/restore drill, F05 deployment-lock hardening, F06 matchmaking revalidation, and F12 wrapper reconciliation remain the next follow-up work. Recommended next code patch: F03. Recommended root-dependent operational task: diagnose the scheduled backup and complete an isolated restore drill.
- Impeccable update remains deferred.
