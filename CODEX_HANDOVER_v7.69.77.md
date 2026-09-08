# CODEX HANDOVER v7.69.77

## Release

`v7.69.77` is an internal-maintenance release combining two reviewed packages:

1. F07 matchmaking waiting-ticket lease/expiry.
2. F05/F12 repository deployment-wrapper hardening.

Broader External Alpha remains **not approved**. The Alpha reset was not performed and
Impeccable was not updated.

## F07 matchmaking lease

Waiting tickets now carry server-owned `lastActivityAt` and `leaseExpiresAt` fields. The
default inactivity lease is five minutes and is configurable with `MATCHMAKING_LEASE_MS`.
The owner heartbeat uses the existing matchmaking status route and renews only when the
remaining lease is at or below half of the configured duration. Expiry is inclusive:
`now >= leaseExpiresAt`.

Expired tickets become terminal `EXPIRED` with reason `QUEUE_LEASE_EXPIRED`. They are never
revived, matched, or automatically requeued. Candidate scans reconcile and skip expired tickets,
and the commit path performs a final lease check after profile locking. F06 `DECK_STALE`
semantics remain separate.

Legacy waiting JSON without lease fields derives activity conservatively from
`lastActivityAt`, `updatedAt`, or `createdAt`; missing or invalid timestamps expire. Terminal
states remain terminal after restart. Matchmaking remains `FILE_JSON_LOCAL`; no migration was
added.

The client exits the waiting state on expiry and displays localized EN/DE requeue guidance.

## F05/F12 deployment wrapper source

`ops/deploy.sh` is now the reviewed repository-authoritative candidate. The lock is acquired
before shared checkout mutation, including `--check`; the lock remains held through preparation,
migration, activation, health/readiness checks, and rollback. Tag/commit/package identity is
bound and immutable-release protections remain enabled. Installed-only hardening (`umask 0022`
and migration runner/cutover marker mode normalization) is preserved in source.

The repository candidate was committed, but `/opt/office-card-game/deploy.sh` was **not** replaced.
The production wrapper remains the previous installed copy with checksum
`0f0f159cac08f911e91f159dc778d85e786f01c5501e13625df571b832555edd`. Root-authorized installation,
checksum verification, F04 backup diagnosis, and restore testing remain separate operational work.

## Verification

- `npm ci --offline --no-audit --no-fund` passed.
- `npm run build` passed.
- `npm test` passed, including F03, F06, F07, settlement, and deployment-hardening regressions.
- Dedicated F07 service suite: 7/7 passed.
- Disposable PostgreSQL 18 integration passed, including F07 HTTP/lease, F06, settlement, and restart coverage.
- i18n, artwork, cosmetics, security, and card-content audits passed.
- Node syntax and shell syntax checks passed; `git diff --check` passed.
- Browser consolidation remained blocked by the known Windows `spawn EPERM` limitation.
- Direct DB: `Direct DB unavailable — OCG_TEST_DATABASE_URL unset.`

Effective production architecture remains Account/Profile `POSTGRES`, Guest `MEMORY_ONLY`,
Room/Matchmaking `FILE_JSON_LOCAL`, migrations `2/2 current/exact`, and `timerActive:false`.

## Open findings

- F04: scheduled PostgreSQL backup/restore drill remains open and root-dependent.
- F05: resolved in repository candidate; production installation pending.
- F07: resolved.
- F12: resolved in repository candidate; production parity pending installation.

Next root-dependent task is installation/parity verification of the reviewed deployment wrapper,
followed by F04 backup/restore work. No production wrapper replacement occurred in this release.
