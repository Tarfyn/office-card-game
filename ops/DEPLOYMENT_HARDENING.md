# Deployment hardening

The production wrapper is `/opt/office-card-game/deploy.sh` on the VPS. The reviewed source
replacement is `ops/deploy.sh`; it is not copied to the VPS automatically by an application
release. Installation or replacement is a separate human-root operations change. The entry point
and its parent must not be writable by `ocgadmin`, for example:

```sh
sudo install -o root -g root -m 0755 ops/deploy.sh /opt/office-card-game/deploy.sh
sudo chown root:root /opt/office-card-game
sudo chmod 0755 /opt/office-card-game
```

No application version bump or tag is required to activate the wrapper itself. The wrapper must
be installed during an operations window and then can deploy an existing immutable tag.

## Install and audit policy

The deployment-critical install is:

```sh
npm ci --no-audit --no-fund --foreground-scripts \
  --fetch-retries=2 --fetch-retry-factor=2 --fetch-retry-mintimeout=1000 \
  --fetch-retry-maxtimeout=10000 --fetch-timeout=30000
```

It is bounded to 600 seconds by default and keeps devDependencies because the VPS runs the build
and full tests before preparing a release. The npm advisory service is intentionally not on the
deployment-critical path. The separate informational check is `npm run ops:security-audit` and
does not run `npm audit fix`.

After tests, the wrapper installs production-only dependencies, verifies that `argon2` and `pg`
load, and includes `node_modules` in the immutable release. This avoids relying on the mutable
checkout for native authentication or database runtime modules.

There is no repository-wide vulnerability threshold policy today. An unavailable or slow advisory
endpoint does not block deployment when install, build, tests and live checks pass. Audit findings
remain visible and require a separately reviewed dependency change.

## Safety sequence

The wrapper parses and syntactically validates an explicit release tag or full commit, then
acquires a kernel-managed `flock` before entering the shared deployment checkout. Both normal
deployments and `deploy.sh --check <tag>` use this same lock because target preparation performs
`git fetch`, checkout, and reset mutations. Once locked, the wrapper resolves the tag identity
once, verifies the checked-out commit and package/version surfaces, checks disk/registry/service
preconditions, then runs install, build and tests with visible stage logging. A fresh helper-owned
release is prepared from the validated tree. The active symlink is never modified in place. Once
the release is finalized, the wrapper validates the exact `deploy/postgres-persistence-ready`
marker. Marked releases must complete
`sudo -n /usr/local/sbin/ocg-db-helper migrate <validated-release>` before activation. Migration
failure leaves the previous release active and discards only the inactive release prepared by that
attempt. The wrapper never calls `enable-postgres`.

After activation it requires the service to be active with a valid main PID, `/api/ready` to be
`READY`, and `/api/health` to be healthy with the expected version and `timerActive:false`. The
endpoint version checks prove that the active service is serving the intended release without
depending on cross-user `/proc` working-directory inspection. A failed post-cutover check performs
at most one helper-mediated rollback and rechecks the previous release. A pre-cutover failure
discards only the release prepared by that attempt. An already-existing immutable target is never
overwritten.

The lock covers target resolution, checkout/reset, build/test, release preparation, migration,
activation, readiness/health verification, and any rollback attempt. A contending invocation
fails immediately with no checkout or release mutation. The lock is an OS file lock, so it releases automatically when the process exits. The current
helper-managed release layout retains the active release and prior release directories; no
automatic pruning is performed by this wrapper, so rollback targets are not silently deleted.

`deploy.sh --check <tag>` performs locked target, version, disk, registry, Node/npm and service
preflight without installing, preparing or activating a release. The resolved tag commit is
bound to `HEAD` and the package application version; a local/remote tag identity mismatch or
tag/package version mismatch fails before release preparation.

## Wrapper parity and installation

`ops/deploy.sh` is the reviewed authoritative source. The installed `/opt/office-card-game/deploy.sh`
must be an exact copy of a reviewed repository revision; compare its SHA-256 before each
operations change. Installing or replacing it is a separate root-authorized maintenance action,
never part of an application deployment. The reviewed source preserves the production umask
(`0022`) and normalizes the PostgreSQL migration runner and cutover marker to mode `0644` after
validating fixed, non-symlink paths. A future installation should back up the root-owned wrapper,
install atomically as `root:root` mode `0755`, read back and compare the checksum, run static and
non-mutating `--check` smoke, and only then make it the deployment entry point. F04 scheduled
backup diagnosis and restore testing remain separate unresolved operational work.

## Known diagnosis

The v7.69.49 incident was an npm Security Audit advisory POST that took several minutes while
package tarball access and the npm cache were healthy. `--no-audit` removes that advisory request
from the critical install path; fetch retries and timeouts still bound genuine registry/package
network failures.
