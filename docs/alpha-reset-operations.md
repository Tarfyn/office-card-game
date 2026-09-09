# Alpha reset operations contract

The Alpha reset is a root-authorized maintenance operation. It is not part of the
application release or normal service startup, and no reset is currently scheduled.
The reviewed entry point is `ops/ocg-alpha-reset`; installation is a separate root
operation and must never be performed by an application deployment.

## Trusted execution

The future installed helper is expected at `/usr/local/sbin/ocg-alpha-reset`, owned
by `root:root` with mode `0755`. A root operator must install it atomically from a
reviewed release, read back its checksum, and run its dry-run smoke before allowing
an apply. The helper accepts only `--dry-run`, `--apply`, `--resume`, and the named
epoch/cutoff/backup/snapshot arguments. It does not invoke `sudo`, `systemctl`, a
shell, or arbitrary commands.

The helper resolves `/srv/office-card-game/current` and requires the active release
to be a canonical directory beneath `/srv/office-card-game/releases`. The reset
program and `package.json` must be regular root-owned release files. Production
apply always uses the fixed `/srv/office-card-game/runtime` directory; a custom
runtime directory is available only when `OCG_ALPHA_RESET_TEST=1` is set in an
isolated test process. The environment file is `/etc/office-card-game.env`, owned
by `root:root` mode `0600`.

Backups must resolve beneath `/srv/office-card-game/backups/postgresql` and legacy
snapshot references beneath `/srv/office-card-game`. Every path component is
checked with `lstat`/`realpath`; symlinks, non-regular files, and paths outside the
approved roots are rejected. Runtime stores and recovery archives are likewise
canonical, regular, and never overwritten in place.

## Durable phases and recovery

State is written atomically and fsynced at
`/var/lib/office-card-game-db-helper/alpha-reset-state.json` (test runs provide a
stable `--state-dir`). The state machine is:

`PREPARED -> RUNTIME_ARCHIVED -> RUNTIME_REINITIALIZED -> DB_COMMITTED -> COMPLETED`.

The runtime archive records each file's canonical path, byte count, and SHA-256.
If a failure occurs before the database commit, the archive is verified and the
runtime stores are restored before the state is marked `RECOVERY_REQUIRED`. A
resume validates the durable state and archive. If the database marker is already
committed, resume records `COMPLETED` without applying a second reset. A completed
epoch returns `ALREADY_APPLIED`. No legacy JSON snapshot is treated as an automatic
PostgreSQL rollback source.

The PostgreSQL transaction records the epoch, cutoff, backup reference, legacy
snapshot reference, and runtime archive evidence in `persistence_metadata`. The
settlement epoch fence rejects pre-cutoff completions after the reset.

## Operator checklist

Before any future apply, freeze the relevant writes, capture a validated PostgreSQL
dump and legacy snapshot, perform the isolated restore rehearsal, review the dry-run
summary, and obtain explicit approval for the epoch and policy decisions. Run the
root helper with the exact confirmation token only once. On interruption, inspect the
durable phase and use `--resume` only after confirming the archived hashes. Keep the
original backup and snapshots untouched for their normal retention policy.

This contract does not authorize an Alpha reset, production data mutation, wrapper
installation, or changes to systemd. F04 backup health and the F05/F12 deployment
wrapper installation remain separate root-dependent operations.
