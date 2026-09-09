# CODEX Handover v7.69.80 — Alpha epoch fence and reset tooling

## Scope

This candidate adds the pre-Alpha epoch/cutoff fence and deterministic reset tooling. It does not reset production, deploy, install the deployment wrapper, or change PostgreSQL schema.

## Epoch fence

`PostgresAccountService.settleMatchCompletion` reads the durable `persistence_metadata.alpha_reset` marker under the settlement transaction. Once an epoch is applied, server-owned room `createdAt` provenance must be present and at or after `cutoffAt`; otherwise settlement fails closed with `ALPHA_EPOCH_FENCE`. Room completion records persist `REJECTED` state so the retry loop cannot repeatedly attempt a fenced completion. Existing settlement idempotency remains intact.

## Reset tool

`npm run ops:alpha-reset` is dry-run by default. Apply requires an explicit epoch and cutoff, the exact `ALPHA_RESET:<epochId>` confirmation token, a validated recent custom-format PostgreSQL backup, and a legacy runtime snapshot reference. It locks users deterministically, rebuilds profiles through canonical starter/economy/ranked helpers, revokes sessions, preserves privileged-role counts, writes the durable epoch marker transactionally, and atomically reinitializes the local Room/Matchmaking stores after archiving them. Production apply is pinned to `/srv/office-card-game/runtime`; custom runtime paths are test-only. Backups, snapshots, runtime stores, archives, and state files are canonicalized and reject symlink escapes. Runtime archive artifacts carry byte counts and SHA-256 evidence in both the durable state and epoch marker. A repeated epoch returns `ALREADY_APPLIED`.

The constrained future root entry point is `ops/ocg-alpha-reset`, intended for `/usr/local/sbin/ocg-alpha-reset` with root-only execution and no shell/sudo/systemd access. It validates the immutable active release and root-owned environment before invoking the reviewed tool. Recovery state is fsynced through `PREPARED`, `RUNTIME_ARCHIVED`, `RUNTIME_REINITIALIZED`, `DB_COMMITTED`, `COMPLETED`, and `RECOVERY_REQUIRED`. An injected interruption regression restores the original runtime bytes, resumes deterministically, verifies archive hashes, and confirms idempotency.

## Rehearsal and QA

The disposable PostgreSQL 18 rehearsal restored the real timer-generated production dump, proved dry-run zero writes, applied the reset, verified the epoch fence and post-reset policy, restarted the application, and reached `/api/ready` and `/api/health`. The Docker DB chain includes the reset and interruption/resume regressions. Migration checks canonicalize checkout line endings so restored production dumps remain 2/2 current/exact on Windows and Linux.

## Operational boundaries

Production remains on v7.69.79 and was not mutated. F04 scheduled backup/restore, F05/F12 wrapper work, and the External Alpha decision remain separate operational concerns. Alpha reset, release tag, push, deployment, and Impeccable update are deferred for explicit review.
