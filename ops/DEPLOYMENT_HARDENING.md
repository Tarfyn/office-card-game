# Deployment hardening

The production wrapper is `/opt/office-card-game/deploy.sh` on the VPS. The reviewed source
replacement is `ops/deploy.sh`; it is not copied to the VPS automatically by an application
release. Activation is a separate, reviewed operations change, for example:

```sh
sudo install -o ocgadmin -g ocgadmin -m 0755 ops/deploy.sh /opt/office-card-game/deploy.sh
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

There is no repository-wide vulnerability threshold policy today. An unavailable or slow advisory
endpoint does not block deployment when install, build, tests and live checks pass. Audit findings
remain visible and require a separately reviewed dependency change.

## Safety sequence

The wrapper validates an explicit release tag or full commit, verifies the checked-out commit and
package/version surfaces, acquires a kernel-managed `flock`, checks disk/registry/service
preconditions, then runs install, build and tests with visible stage logging. A fresh helper-owned
release is prepared from the validated tree. The active symlink is never modified in place.

After activation it requires the service to be active with the expected release working directory,
`/api/ready` to be `READY`, and `/api/health` to be healthy with the expected version and
`timerActive:false`. A failed post-cutover check performs at most one helper-mediated rollback and
rechecks the previous release. A pre-cutover failure discards only the release prepared by that
attempt. An already-existing immutable target is never overwritten.

The lock is an OS file lock, so it releases automatically when the process exits. The current
helper-managed release layout retains the active release and prior release directories; no
automatic pruning is performed by this wrapper, so rollback targets are not silently deleted.

`deploy.sh --check <tag>` performs target, version, lock, disk, registry, Node/npm and service
preflight without installing, preparing or activating a release.

## Known diagnosis

The v7.69.49 incident was an npm Security Audit advisory POST that took several minutes while
package tarball access and the npm cache were healthy. `--no-audit` removes that advisory request
from the critical install path; fetch retries and timeouts still bound genuine registry/package
network failures.
