# Office Card Game database operations

## Status and scope

The production server remains on `FILE_JSON_LOCAL` until an explicitly approved cutover. The
repository application foundation normalizes the separate PostgreSQL backend to `POSTGRES`, but
merely having `DATABASE_URL` present never activates it.
The server fixes mutable state beneath `/srv/office-card-game/runtime` while releases beneath
`/srv/office-card-game/releases` are immutable after `/usr/local/sbin/ocg-release-helper finalize`.
The active release is selected by the root-owned `/srv/office-card-game/current` symlink.

The current JSON files are:

- `players.local.json`: durable player/profile, economy, ranked, achievements, and deck state.
- `guest-credentials.local.json`: guest tokens mapped to stable player IDs.
- `rooms.local.json`: hosted room state.
- `matchmaking.local.json`: matchmaking state.
- `playtest-feedback.local.json`: feedback records.
- `profiles.local.json`: optional read-only migration source from the former combined store; it may
  be absent on current installations.

`server/storage/local-json.mjs` writes snapshots through a same-directory temporary file and atomic
rename. PostgreSQL is authoritative only for authenticated Account player state when the explicit
backend is `POSTGRES`. At that point Guest profiles use process memory plus the existing browser
snapshot behavior and do not read or write the legacy player/credential JSON files; hosted rooms,
matchmaking state, and playtest feedback keep their separate JSON operational stores. The existing
player JSON files remain untouched until an explicitly approved cutover and old Alpha Guest
progress is intentionally not imported.

Repository implementation and tests install no PostgreSQL packages and perform no production
operation. The recorded VPS infrastructure baseline is Ubuntu 26.04 with PostgreSQL 18.6,
loopback-only listeners, a working daily backup timer, and 30-day dump retention; this state still
requires an explicit release/cutover review.

## Target architecture

The fixed resources are:

- PostgreSQL major version: 18
- Database: `office_card_game`
- Login role: `office_card_game_app`
- Network endpoint: `127.0.0.1:5432` and the local PostgreSQL Unix socket
- Service environment: `/etc/office-card-game.env`, `root:root`, mode `0600`
- PostgreSQL backups: `/srv/office-card-game/backups/postgresql`
- Legacy JSON backups: `/srv/office-card-game/backups/legacy-json`
- Helper state: `/var/lib/office-card-game-db-helper`, `root:root`, mode `0700`
- Listener classifier: `/usr/local/share/office-card-game/ocg-db-listener-classifier.awk`,
  `root:root`, mode `0644`

The backup root is `root:root` mode `0750`. Legacy JSON backup directories are independently
prepared as `root:root` mode `0700` and do not require PostgreSQL packages, a `postgres` Unix user,
`DATABASE_URL`, or a running database service. The PostgreSQL dump directory is prepared separately
as `postgres:postgres` mode `0750`, only during bootstrap after package installation has created and
validated the PostgreSQL system identity.

Bootstrap installs/requires Ubuntu's `acl` package and adds only the named access ACL
`user:postgres:--x` to `/srv`, `/srv/office-card-game`, and
`/srv/office-card-game/backups`. `--no-mask` preserves the existing ACL mask and therefore preserves
the effective permissions of existing entries, including the established `ocgadmin` access model.
The named entry gives `postgres` path traversal without directory listing or parent-directory write
access. It does not add a default ACL. `postgres` has normal owner access only inside
`/srv/office-card-game/backups/postgresql`; `legacy-json` remains `root:root` mode `0700` with no
`postgres` ACL and is neither readable, writable, nor traversable by that user.

The application role owns only its dedicated database. It is explicitly `NOSUPERUSER`,
`NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, and `NOREPLICATION`. Owning the dedicated database lets
the same role apply application migrations without cluster-wide privileges.

PostgreSQL receives a managed `conf.d` file setting `listen_addresses` to only
`127.0.0.1,::1`, and first-match HBA entries require SCRAM-SHA-256 for the application database and
role. The helper never creates a UFW allow rule. Bootstrap fails if local inspection finds a UFW
ALLOW rule for 5432 or any non-loopback TCP listener.

## Security model

The installed helper is `/usr/local/sbin/ocg-db-helper`, owned by `root:root`, mode `0755`. Its only
sudoers rule is:

```sudoers
ocgadmin ALL=(root) NOPASSWD: /usr/local/sbin/ocg-db-helper
```

There is no NOPASSWD grant for package managers, PostgreSQL clients, `systemctl`, shells, editors,
or filesystem utilities. The installer is not copied into a privileged location and receives no
sudoers grant. The audited VPS retains its separate existing
`/usr/local/sbin/ocg-release-helper` NOPASSWD rule; the installer accepts exactly that established
rule plus the new DB-helper rule and rejects any other passwordless command.

The helper accepts only its named actions. It accepts no user-controlled path. The only action with
an argument is `migrate`, whose release name must match exactly
`^v[0-9]+\.[0-9]+\.[0-9]+-[0-9a-f]{8}$`. The canonical resolved directory must equal
`/srv/office-card-game/releases/<release>`, must not be a symlink, must be owned by
`officecardgame`, and must not be writable by `ocgadmin`.

Migration execution is not arbitrary command execution. The helper runs only
`scripts/db-migrate.mjs` from that finalized release, as `officecardgame`, inside a transient
systemd unit with a read-only filesystem, no capabilities, `NoNewPrivileges`, and network access
restricted to localhost. It also requires the exact fixed marker
`deploy/postgres-persistence-ready` containing:

```text
OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1
```

Do not add that marker until the application genuinely supports PostgreSQL persistence and its
readiness endpoint requires the database.

The generated database password is 32 random bytes represented as 64 lowercase hexadecimal
characters. It is written directly into `DATABASE_URL` in the root-owned environment file. The
helper neither prints it nor puts it in the repository. Environment updates are atomic, preserve
all unrelated lines, reject duplicate managed keys, and restore `root:root` mode `0600`.

## Helper actions

### `audit`

Read-only. Reports package/service/version status, database and role presence, configured listener,
TCP and Unix socket state, local public-exposure indicators, UFW lines relevant to 5432,
`DATABASE_URL` presence with the value redacted, selected persistence backend, known JSON files,
migration count, backup status, and current release.

The exposure result is based on local bind/listener and UFW evidence. A human should still perform
an external 5432 connection scan after bootstrap.

TCP listener inspection requests numeric `ss` output and classifies only its local endpoint column.
IPv4 addresses in `127.0.0.0/8` and IPv6 `::1` are accepted; wildcard or concrete non-loopback
addresses fail validation. The peer endpoint column is ignored. Unix sockets are local and are
reported separately. PostgreSQL's own `SHOW listen_addresses` check remains an independent
bootstrap requirement.

### `bootstrap`

Idempotently installs the fixed PostgreSQL 18 server/client packages when absent, ensures cluster
`18/main`, writes only the helper-managed PostgreSQL/HBA include files, enables and restarts the
PostgreSQL service, creates or validates the fixed database and role, generates/synchronizes the
credential, writes `DATABASE_URL`, creates backup/state directories, validates loopback-only
operation, validates the restricted PostgreSQL backup path as the `postgres` Unix user, and enables
the fixed daily backup timer.

The backup-path validation confirms that every protected parent has the exact execute-only named
ACL, that `postgres` cannot list or write those parents, and that the PostgreSQL dump directory is
owned by `postgres:postgres` mode `0750`. Permission validation uses real operations as `postgres`,
not `test -r`, `test -w`, or `test -x`: fixed `env --chdir` calls prove traversal, fixed `ls` calls
must fail where listing is forbidden, and fixed-template `mktemp` probes prove or disprove creation.
Every successful creation probe is removed before its result is returned. Validation also requires
an existing `legacy-json` directory to remain `root:root` mode `0700`, and requires chdir, listing,
and creation there all to fail as `postgres`. Bootstrap records completion and enables the timer only
after these checks pass. Reapplying the same named ACL is idempotent.

It does not set `PROFILE_STORAGE_BACKEND`, restart the game service, migrate schema, alter UFW, or
cut over persistence.

### `backup-legacy`

Stops only `office-card-game.service` when it is active, copies every present known JSON persistence
file to a new timestamped root-only directory, writes SHA-256 checksums and metadata, syncs the
filesystem, and restarts the service. A failure trap attempts to restart a service that was active.
Legacy backups have no automatic deletion policy. This action is intentionally usable before
bootstrap and neither inspects nor prepares PostgreSQL resources.

### `backup-now`

Creates a PostgreSQL custom-format compressed `pg_dump`, validates it with `pg_restore --list`,
then atomically publishes it under the fixed PostgreSQL backup directory. Dumps are
`root:postgres` mode `0640`. Files older than 30 days are removed only from that fixed
directory and only when their names match `office_card_game-*.dump`.

### `backup-status`

Reports the configured directories, retention, state markers, PostgreSQL backup-path ACL readiness,
and up to ten recent PostgreSQL and legacy backups. Permission validation may attempt fixed-template
creation probes; any successful probe is immediately removed, so this action leaves no persistent
state.

### `migrate <validated-release>`

Requires successful bootstrap, a finalized immutable release, its fixed runner and readiness
marker, and the helper-managed local `DATABASE_URL`. It creates a pre-migration dump, runs ordered
SQL migrations as `officecardgame`, verifies `schema_migrations`, creates a post-migration dump,
and records the successful release and backup. Any migration or validation failure returns
non-zero and does not enable PostgreSQL persistence.

The runner accepts only `NNNN_lowercase_name.sql` files from `db/migrations`. Prefixes must be
unique. It holds a PostgreSQL advisory lock, wraps each unapplied migration in a transaction,
records its SHA-256 checksum, and rejects changed applied migrations, psql meta-commands, and
migration-owned transaction control. Migrations must be additive and forward-compatible.

### `enable-postgres`

Requires successful bootstrap, a recorded legacy JSON backup, a successful validated release
migration, and a valid post-migration dump. It changes only these managed service-environment keys:

```text
PROFILE_STORAGE_BACKEND=POSTGRESQL
DATABASE_REQUIRED=1
```

`POSTGRESQL` is the accepted root-helper environment contract. The application normalizes it to
the internal backend name `POSTGRES`; this does not create a second persistence mode.

It does not restart the service or alter the `current` symlink. The operator must immediately
activate exactly the release printed by the helper through the existing release helper. The new
application readiness implementation must refuse READY when `DATABASE_REQUIRED=1` and PostgreSQL
is unavailable.

## One-time human-root installation

Before running anything as root, the administrator must check out the reviewed commit and inspect
all files in `ops/`, especially the helper and sudoers candidate. From the repository root:

```bash
sudo bash -n ops/ocg-db-helper
sudo bash -n ops/install-db-helper.sh
sudo visudo -cf ops/office-card-game-db.sudoers
sudo bash ops/install-db-helper.sh
```

The installer copies only the reviewed helper, exact sudoers file, and immutable backup-unit
templates into `/usr/local/share/office-card-game/`. It does not install either backup unit into
`/etc/systemd/system`, enable a timer, require `postgresql.service`, install PostgreSQL, or run
bootstrap. It validates the helper/service template syntax after the helper is installed, while the
timer and its runtime dependency are intentionally deferred until bootstrap. It also validates
ownership/modes and verifies that `ocgadmin` has exactly the existing release helper and new DB
helper as NOPASSWD commands, and cannot run `/usr/bin/true` through `sudo -n`. Do not grant
`ocgadmin` NOPASSWD access to the installer, repository paths, or any interpreter.

The service unit uses the supported `ConditionPathExists=/usr/local/sbin/ocg-db-helper` directive.
It deliberately has only `After=postgresql.service`; the helper itself checks that PostgreSQL is
active and ready before taking a backup. This lets the service template be parsed before PostgreSQL
is installed without weakening runtime safety.

## Provisioning and backup flow

After the human installation and a fresh read-only audit:

```bash
sudo -n /usr/local/sbin/ocg-db-helper audit
sudo -n /usr/local/sbin/ocg-db-helper bootstrap
sudo -n /usr/local/sbin/ocg-db-helper audit
sudo -n /usr/local/sbin/ocg-db-helper backup-legacy
sudo -n /usr/local/sbin/ocg-db-helper backup-now
sudo -n /usr/local/sbin/ocg-db-helper backup-status
```

Bootstrap is infrastructure preparation, not application cutover. It first installs/configures
PostgreSQL and validates the loopback-only database, then copies the immutable templates into
`/etc/systemd/system`, runs `systemd-analyze verify` on both final units, reloads systemd, and only
then enables/starts the backup timer. Any unit verification failure returns non-zero before the
timer is enabled. Existing JSON persistence keeps running after these commands.

If the human installer is interrupted, rerunning it is safe: fixed destinations are replaced with
the reviewed root-owned copies, no database or service unit is enabled, and the sudoers rule is
revalidated. A partial bootstrap is likewise retryable; it may leave packages/configuration in
place, but the helper will not record bootstrap completion or enable the backup timer until the
database and final unit verification succeed.

After installing a helper revision that introduces or repairs this ACL contract on an already
bootstrapped host, rerun `bootstrap` before `backup-now`. The idempotent bootstrap reapplies the one
fixed named ACL per protected parent and performs the real-user access probe before returning
success. `backup-now` also revalidates the same policy through `require_bootstrap` and fails closed
if the ACL chain later regresses.

## Migration and cutover flow

1. Build and fully test an application release containing additive SQL migrations, the fixed
   runner, the exact readiness marker, PostgreSQL account/profile support, and DB-dependent
   readiness.
2. Prepare and finalize it with the existing `/usr/local/sbin/ocg-release-helper`; do not activate
   it yet.
3. Run `backup-legacy` immediately before the cutover window.
4. Run `migrate <release>`. A non-zero result blocks activation.
5. Review `audit` and `backup-status`.
6. Run `enable-postgres` and note the exact release it prints.
7. Activate exactly that release through `ocg-release-helper activate <release>`.
8. Verify `/api/ready`, `/api/health`, authentication, persistence, and an external scan proving
   that 5432 is unreachable.

The repository deployment script must be updated in the application implementation release so the
pre-activation legacy backup and migration are mandatory. This helper intentionally does not modify
the existing root-owned release helper.

## Restore and rollback

Restore is deliberately human-root-only; there is no remotely invokable restore action. The human
must stop the application, preserve the failed database with another dump, restore into a reviewed
fresh database using `pg_restore`, validate ownership/schema/migrations, and only then restart the
application. Never use `--clean` or drop the production database without a separate reviewed
recovery plan.

Code rollback remains available through `ocg-release-helper activate <previous-release>`, but SQL
migrations are forward-only and are not automatically reversed. Therefore every migration must be
additive and compatible with the previous application release during the rollback window. If that
compatibility is not possible, cutover is NO-GO until a tested expand/migrate/contract sequence is
designed.

Disabling PostgreSQL persistence is also human-root-only because the helper intentionally has no
rollback or arbitrary environment-edit action. A root administrator must restore the reviewed
environment state and activate a compatible release.

## Responsibility boundary

Human root remains required to:

- inspect and install the helper/sudoers/systemd artifacts;
- remove any pre-existing public firewall rule for 5432;
- approve the first bootstrap and final production cutover;
- perform restores or emergency environment rollback;
- modify or replace the helper itself.

After installation, Codex acting as `ocgadmin` may invoke only the documented helper actions and the
existing release helper. It still may not run arbitrary root commands, edit `/etc`, modify UFW,
restore databases, or alter the helper.

## Exact NO-GO conditions

Stop without cutover if any of these is true:

- helper or sudoers ownership/mode differs from the documented values;
- any unexpected `NOPASSWD` command exists;
- the OS is not the audited Ubuntu 26.04 target or PostgreSQL 18 packages are unavailable;
- PostgreSQL reports a non-loopback listener or UFW allows 5432;
- the environment file is not a regular root-owned mode-0600 file;
- the existing database has a different owner;
- no consistent legacy JSON backup exists;
- the release name/path/ownership/readiness marker fails validation;
- migrations or checksum validation fail;
- the post-migration dump fails validation;
- the candidate does not make `/api/ready` depend on PostgreSQL;
- standard, DB integration, concurrency, desktop/mobile, or cross-browser QA is incomplete;
- explicit production cutover approval has not been given.

## Application persistence and Account contract

`PROFILE_STORAGE_BACKEND` accepts `FILE_JSON_LOCAL`, the helper-managed value `POSTGRESQL`, or
`POSTGRES`. Both PostgreSQL spellings normalize to the single internal backend `POSTGRES`.
`DATABASE_URL` is parsed as a fixed loopback connection to database `office_card_game` and role
`office_card_game_app`; the application never logs or returns it. The Node server uses a bounded
`pg` pool (default maximum 10, 5-second connection timeout, 30-second idle timeout).

The first additive migration creates `users`, `sessions`, `player_profiles`, `player_decks`,
`reward_grants`, `achievement_progress`, and `persistence_metadata`. Account IDs are UUIDs.
Passwords use Argon2id with 64 MiB memory, three iterations, and one lane. The server admits at
most two Argon2 operations concurrently and queues at most 20 more; excess work fails with a
retryable 429 instead of multiplying the memory work factor without bound. Browser sessions use a
32-byte random opaque token in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie that is `Secure` in
network/production mode; PostgreSQL stores only SHA-256 token hashes. Sessions expire after 30 days,
are revoked immediately on logout, update `last_used_at`, and are periodically cleaned after a
seven-day diagnostic retention window.

All Account profile mutations resolve the user from the session cookie, lock that user's
`player_profiles` row, run the existing game-domain normalization/validation, and update the JSONB
profile plus normalized Deck/RewardGrant/Achievement projections in one short transaction. Multi-
profile Ranked settlement locks UUID rows in stable sorted order. This preserves Deck revisions and
`DECK_CONFLICT`, RewardGrant/sourceRef idempotency, and prevents two processes/devices from spending
the same balance snapshot concurrently. PostgreSQL is never an automatic fallback: when it is the
selected backend and is unavailable or stale, `/api/ready` returns 503.

Readiness treats additional migration records from a newer release as forward-compatible because
all production migrations are required to be additive; this keeps code rollback possible. It still
fails closed for a missing required migration or any checksum change. The Ops response reports
newer/unknown records separately, and exact migration-set equality remains observable.

Account endpoints are `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, and `GET /api/auth/current`. Register/login accept JSON only, normalize
email by trimming and lowercasing, enforce a 254-character basic email shape, and accept passwords
of 10–128 characters. Network-mode cookie-authenticated writes require a matching Origin/Referer;
cookies add a second same-origin barrier. Registration is limited to 5 attempts per IP per 15
minutes and login to 10 attempts per IP per 10 minutes. Passwords, password hashes, raw session
tokens, and token hashes are never returned or logged.

Guest mode remains available for low-friction Alpha testing and keeps browser-bound Alpha state.
Under `FILE_JSON_LOCAL`, the existing Guest server persistence remains unchanged. Under `POSTGRES`,
Guest server identity is deliberately memory-only so the archived legacy player/credential files
remain unwritten; a process restart may create a new Guest identity from the browser snapshot. It
is visibly labeled temporary and has no cross-device guarantee.
Registering creates a fresh server-defined Account profile; Guest cards, Decks, currencies,
cosmetics, Ranked state, achievements, and rewards are not claimed or migrated. The legacy JSON
archive remains available for safety/debugging only after cutover.
Authenticated Account metadata and Decks are never written into the Guest localStorage keys; the
pre-existing Guest cache is preserved separately and restored only after logout. It is neither an
Account cache nor an authorization source.

Email verification, password reset, social login, account linking, and an account-management
dashboard are future work.

## Operations cockpit

`/ops` is a dedicated read-only internal cockpit. The HTML route and every
`GET /api/ops/{overview,system,persistence,database,backups,accounts,progression,diagnostics,cutover}`
endpoint independently resolve the opaque Account session and require the database-backed role
`OPS` or `ADMIN`. An unauthenticated request receives 401; a normal `PLAYER` receives 403. Hiding
the Lobby link is not an authorization boundary, and client/profile role fields are ignored.

New registrations always receive `PLAYER`. Because email verification is not yet implemented,
there is intentionally no email allowlist that silently grants Ops authority. After the reviewed
Account has registered, a human root administrator must verify its identity and run the narrowly
scoped repository CLI through a transient service that reads the existing root-managed environment:

```bash
sudo /usr/bin/systemd-run --wait --pipe --collect \
  --property=User=officecardgame \
  --property=Group=officecardgame \
  --property=WorkingDirectory=/srv/office-card-game/current \
  --property=EnvironmentFile=/etc/office-card-game.env \
  /usr/bin/node /srv/office-card-game/current/scripts/account-role.mjs \
  grant-ops reviewed-operator@example.com
```

For the separately reviewed initial administrator, replace `grant-ops` with `grant-admin`. The CLI
accepts exactly one of those two commands and one normalized email address. It uses parameterized
SQL, requires an existing active `PLAYER`, refuses a different existing privileged role, and is
idempotent when the requested role is already present. It never accepts SQL, a database URL, a
filesystem path, a generic role value, or a password as an argument and never prints credentials.

This remains human-root-only; it is not an `ocg-db-helper` action, receives no `NOPASSWD` grant,
and the web application exposes no role mutation endpoint. Normal Ops use requires no arbitrary SQL.

The cockpit reports application/runtime state, explicit source of truth, PostgreSQL reachability
and version, schema/migration counts, pool pressure, Account/Profile/Session aggregates, recent
protected Account identities, a bounded recent-profile support sample, progression aggregates,
Alpha reset/cutover state, and structured
non-secret diagnostic categories. Queries are cached for 15 seconds. It never exposes environment
values, connection strings, passwords, hashes, session tokens, Guest credentials, stack traces,
arbitrary paths, SQL, logs, shell commands, helper invocation, restore, migration, or deployment
controls.

The application service has no sudo/root/systemd access. The current helper/timer writes no
application-readable status record, so last backup timestamps, dump sizes, timer next-run state,
and root-helper state display as `UNAVAILABLE`. Retention displays the fixed 30-day policy. A future
helper revision may atomically publish a deliberately non-secret root-owned/readable summary file;
do not grant the Node service helper or systemd privileges for this purpose.

Phase 1 is visibility-only. Any future session invalidation, grant, progression correction,
cosmetic grant, or account suspension must first introduce an Admin Audit Log recording WHO, WHEN,
ACTION, TARGET, BEFORE, AFTER, and REASON.

## Local and isolated database verification

Normal source/build checks do not silently emulate PostgreSQL. Static Account/Auth/Ops tests run via
`npm run test:account`. The real integration suite requires a disposable database whose name starts
with `office_card_game_test`:

```bash
OCG_TEST_DATABASE_URL='postgresql://test_role:test_password@127.0.0.1:5432/office_card_game_test_accounts' npm run test:db
```

For a fully disposable local run, `npm run test:db:docker` verifies that `127.0.0.1:5432` is free,
starts `postgres:18` with a test-only database and credential bound only to that loopback address,
runs `test:db`, and stops/removes its uniquely named container in a `finally` cleanup. It refuses to
reuse an occupied port and never reads `DATABASE_URL`.

The URL guard rejects the production database name. The suite drops only its validated test tables,
runs migrations concurrently and repeatedly, exercises registration/login/logout/expiry and Ops
authorization, persists the complete representative profile domains across a new pool, and tests
duplicate rewards, double spending, concurrent mutations, stale Deck revisions, stale migration
history, transactional migration failure, and secret-free Ops responses. Missing
`OCG_TEST_DATABASE_URL` is a hard failure, not a skipped green test.

The cutover marker must remain absent until this database suite plus browser cross-context and
responsive QA have passed against the release candidate.

## PostgreSQL references

- [PostgreSQL 18 connection settings](https://www.postgresql.org/docs/18/runtime-config-connection.html)
- [PostgreSQL 18 `pg_hba.conf`](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL 18 `pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html)
- [PostgreSQL 18 SQL dump and restore guidance](https://www.postgresql.org/docs/18/backup-dump.html)
