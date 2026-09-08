# CODEX Handover — v7.69.79

## Release identity

- Application release: **v7.69.79**
- Release channel: `INTERNAL_MAINTENANCE`
- v7.69.78 remains immutable, tagged and pushed, but was never activated.
- v7.69.78 deployment stopped before activation because its deployment regression had a test-harness synchronization race under Linux/Node 22.
- Production remains v7.69.77 until the v7.69.79 deployment completes.

## Deployment regression correction

The deployment wrapper was not defective. The former test inferred lock ownership through a timing-sensitive event-log poll. On Linux/Node 22 the contender could start before the owner had demonstrably acquired and retained the lock.

The corrected regression uses an explicit READY/RELEASE protocol. The owner writes READY only after lock acquisition, remains alive while holding the lock, and exits only after the parent writes RELEASE. The parent verifies owner liveness before starting the contender and checks that the contender exits 75 without mutation.

Results:

- Windows: 4 contention combinations × 25 iterations = 100/100 pass.
- Linux Node 22.22.1: 100/100 pass.
- Failure-owner lock release: pass.
- Linux SIGTERM and SIGINT lock release: pass.
- Contender exit distribution: 75 for every contention case.
- Owner exit distribution: 0 for every case.
- Contender mutations: 0.

`ops/deploy.sh` was not changed. Its repository source retains lock acquisition before target preparation, including `--check`; the production-installed wrapper was not replaced.

## Pre-root hardening included

The release preserves the accepted F08/F10/F11/F13/F14/F15/F16 work, card semantic coverage, performance baseline, and F01/F02/F03/F06/F07/F09 fixes. F17 remains measured with no confirmed performance blocker.

The F05/F12 deployment-wrapper candidate is committed in the repository only. Production installation and parity remain pending root-authorized maintenance.

## QA

- `npm ci --offline --no-audit --no-fund`: pass
- `npm run build`: pass
- `npm test`: pass
- F03/F06/F07/F08/F10/F13/F14 and deployment regressions: pass
- Docker PostgreSQL integration, F06/F07 HTTP integration, and Ranked settlement: pass
- External-CDP browser acceptance: Chrome 152, all four required viewports, pass
- i18n, artwork, cosmetics, security, card-content, and performance audits: pass
- `node --check public/app.js`: pass
- Linux `bash -n ops/deploy.sh`: pass on isolated LF-normalized copy
- `git diff --check`: pass; only expected CRLF normalization warning
- Direct DB: `Direct DB unavailable — OCG_TEST_DATABASE_URL unset.`
- Impeccable: unavailable in this environment; no update performed

## Production and operations

- Production wrapper checksum remains `0f0f159cac08f911e91f159dc778d85e786f01c5501e13625df571b832555edd`, root:root, mode 0755.
- No wrapper installation, production mutation, Alpha reset, or F04 repair was performed.
- Production baseline remains `/srv/office-card-game/releases/v7.69.77-8f97dba1` with migrations 2/2 current/exact and Ranked timer disabled.
- F04 remains open and root-dependent.
- F05/F12 repository status is resolved; production-installed status remains pending root installation/parity verification.
- Broader External Alpha remains **NO**.
