import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const read = (relative) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), "utf8");
const helper = read("ops/ocg-db-helper");
const installer = read("ops/install-db-helper.sh");
const sudoers = read("ops/office-card-game-db.sudoers");
const migrationRunner = read("scripts/db-migrate.mjs");
const backupService = read("ops/office-card-game-db-backup.service");
const backupTimer = read("ops/office-card-game-db-backup.timer");
const listenerClassifier = read("ops/ocg-db-listener-classifier.awk");

const shellFunction = (name) => {
  const match = helper.match(new RegExp(`^${name}\\(\\) \\{\\n([\\s\\S]*?)^\\}\\n`, "m"));
  assert.ok(match, `missing shell function ${name}`);
  return match[1];
};

for (const [name, content] of [
  ["ops/ocg-db-helper", helper],
  ["ops/install-db-helper.sh", installer],
  ["ops/office-card-game-db.sudoers", sudoers],
  ["ops/office-card-game-db-backup.service", backupService],
  ["ops/office-card-game-db-backup.timer", backupTimer],
  ["ops/ocg-db-listener-classifier.awk", listenerClassifier]
]) {
  assert.doesNotMatch(content, /\r/, `${name} must use LF line endings`);
  assert.doesNotMatch(content, /[ \t]+$/m, `${name} contains trailing whitespace`);
}

const bashProbe = spawnSync("bash", ["--version"], { encoding:"utf8" });
const hasBash = !bashProbe.error && bashProbe.status === 0;
if (hasBash) {
  for (const relative of ["ops/ocg-db-helper", "ops/install-db-helper.sh"]) {
    const path = fileURLToPath(new URL(`../${relative}`, import.meta.url));
    const syntax = spawnSync("bash", ["-n", path], { encoding:"utf8" });
    assert.equal(syntax.status, 0, `${relative} failed bash -n: ${syntax.stderr}`);
  }
} else {
  console.warn("DB_OPS_STATIC_CHECK_NOTE · bash unavailable; installer will require bash -n on Ubuntu");
}

assert.equal(
  sudoers.trim().split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).join("\n"),
  "ocgadmin ALL=(root) NOPASSWD: /usr/local/sbin/ocg-db-helper"
);
assert.match(helper, /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+-\[0-9a-f\]\{8\}\$/);
for (const action of ["audit", "bootstrap", "backup-legacy", "backup-now", "backup-status", "migrate", "enable-postgres"]) {
  assert.match(helper, new RegExp(`\\n    ${action.replace("-", "\\-")}\\)`), `missing action ${action}`);
}
for (const forbidden of [/\beval\b/, /bash\s+-c/, /sh\s+-c/, /exec\s+"?\$[@*]/]) {
  assert.doesNotMatch(helper, forbidden, `unsafe helper construct ${forbidden}`);
  assert.doesNotMatch(installer, forbidden, `unsafe installer construct ${forbidden}`);
}
assert.doesNotMatch(sudoers, /\b(?:apt|psql|systemctl|bash|sh|cp|rm|mv|visudo)\b/);
assert.match(installer, /EXPECTED_RELEASE_RULE="\(root\) NOPASSWD: \/usr\/local\/sbin\/ocg-release-helper"/);
assert.match(installer, /EXPECTED_DB_RULE="\(root\) NOPASSWD: \/usr\/local\/sbin\/ocg-db-helper"/);
assert.match(installer, /sudo -n \/usr\/bin\/true/);
assert.match(installer, /TEMPLATE_ROOT="\/usr\/local\/share\/office-card-game"/);
assert.match(installer, /SERVICE_TEMPLATE_TARGET="\$\{TEMPLATE_ROOT\}\/office-card-game-db-backup\.service"/);
assert.match(installer, /TIMER_TEMPLATE_TARGET="\$\{TEMPLATE_ROOT\}\/office-card-game-db-backup\.timer"/);
assert.doesNotMatch(installer, /SERVICE_TARGET="\/etc\/systemd\/system/);
assert.doesNotMatch(installer, /TIMER_TARGET="\/etc\/systemd\/system/);
assert.match(installer, /systemd-analyze verify "\$\{SERVICE_TEMPLATE_TARGET\}"/);
assert.doesNotMatch(installer, /systemctl daemon-reload/);
assert.doesNotMatch(installer, /\bsystemctl\b/);
assert.doesNotMatch(installer, /\/etc\/systemd\/system\/office-card-game-db-backup/);
assert.match(helper, /MIGRATION_RUNNER_REL="scripts\/db-migrate\.mjs"/);
assert.match(helper, /CUTOVER_MARKER_REL="deploy\/postgres-persistence-ready"/);
assert.doesNotMatch(backupService, /ConditionPathIsExecutable/);
assert.match(backupService, /^ConditionPathExists=\/usr\/local\/sbin\/ocg-db-helper$/m);
assert.match(helper, /SERVICE_TEMPLATE="\$\{TEMPLATE_ROOT\}\/office-card-game-db-backup\.service"/);
assert.match(helper, /TIMER_TEMPLATE="\$\{TEMPLATE_ROOT\}\/office-card-game-db-backup\.timer"/);
assert.match(helper, /systemd-analyze verify "\$\{SERVICE_UNIT_PATH\}" "\$\{TIMER_UNIT_PATH\}"/);
assert.match(helper, /systemctl enable --now "\$\{BACKUP_TIMER\}"/);
assert.match(helper, /ss --no-header --listening --tcp --numeric 'sport = :5432'/);
assert.match(helper, /listener_output_has_external_address "\$\{tcp_listeners\}"/);
assert.match(listenerClassifier, /address = local_address\(\$4\)/);
assert.doesNotMatch(listenerClassifier, /\$5/);
const classifierPath = fileURLToPath(new URL("../ops/ocg-db-listener-classifier.awk", import.meta.url));
const observedLoopbackListeners = [
  'LISTEN 0 200 127.0.0.1:5432 0.0.0.0:* users:(("postgres",...))',
  'LISTEN 0 200 [::1]:5432 [::](5432):* users:(("postgres",...))'
].join("\n");
const additionalLoopbackListener = "LISTEN 0 200 127.42.7.9:5432 0.0.0.0:*";
const nonLoopbackListeners = [
  "LISTEN 0 200 0.0.0.0:5432 0.0.0.0:*",
  "LISTEN 0 200 192.168.10.25:5432 0.0.0.0:*",
  "LISTEN 0 200 [2001:db8::25]:5432 [::]:*"
];
const awkProbe = spawnSync("awk", ["--file", classifierPath], { encoding:"utf8", input:"" });
if (awkProbe.error?.code === "ENOENT" || awkProbe.error?.code === "EPERM") {
  console.warn("DB_OPS_STATIC_CHECK_NOTE · awk unavailable; installed helper validates listener fixtures on Ubuntu");
} else {
  assert.ifError(awkProbe.error);
  assert.equal(awkProbe.status, 1, `empty TCP listener set must be safe: ${awkProbe.stderr}`);
  for (const fixture of [observedLoopbackListeners, additionalLoopbackListener]) {
    const result = spawnSync("awk", ["--file", classifierPath], { encoding:"utf8", input:`${fixture}\n` });
    assert.ifError(result.error);
    assert.equal(result.status, 1, `loopback listener was classified as external: ${fixture}`);
  }
  for (const fixture of nonLoopbackListeners) {
    const result = spawnSync("awk", ["--file", classifierPath], { encoding:"utf8", input:`${fixture}\n` });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `non-loopback listener was accepted: ${fixture}`);
  }
}
const backupRootLayout = shellFunction("ensure_backup_root_layout");
const legacyLayout = shellFunction("ensure_legacy_backup_layout");
const postgresLayout = shellFunction("ensure_postgres_backup_layout");
const copyLegacySnapshot = shellFunction("copy_legacy_snapshot");
const legacyBackup = shellFunction("backup_legacy");
const backupStatus = shellFunction("backup_status");
const audit = shellFunction("audit");
const bootstrap = shellFunction("bootstrap");
const backupNow = shellFunction("backup_now");
const backupAccessPolicy = shellFunction("postgres_backup_access_policy_valid");
const backupAccessState = shellFunction("postgres_backup_access_state");
const validateBackupAccess = shellFunction("validate_postgres_backup_access");
const postgresChdirProbe = shellFunction("postgres_can_chdir");
const postgresListProbe = shellFunction("postgres_can_list_directory");
const postgresWriteProbe = shellFunction("postgres_write_probe");
assert.doesNotMatch(backupRootLayout, /postgres|PG_BACKUP_DIR|DATABASE_URL/);
assert.match(legacyLayout, /ensure_backup_root_layout/);
assert.doesNotMatch(legacyLayout, /postgres|PG_BACKUP_DIR|DATABASE_URL/);
assert.match(postgresLayout, /id -u postgres/);
assert.match(postgresLayout, /PG_BACKUP_DIR/);
assert.match(helper, /PG_BACKUP_TRAVERSE_DIRS=\(\n  "\/srv"\n  "\$\{BASE_DIR\}"\n  "\$\{BACKUP_ROOT\}"\n\)/);
assert.match(postgresLayout, /setfacl --no-mask --modify='user:postgres:--x' -- "\$\{directory\}"/);
assert.doesNotMatch(postgresLayout, /setfacl[^\n]*(?:rw|wx|rwx|default:)/);
assert.doesNotMatch(postgresLayout, /setfacl[^\n]*(?:remove|delete|restore|set-file)/);
assert.equal((postgresLayout.match(/setfacl/g) ?? []).length, 1, "ACL bootstrap must idempotently update one fixed entry");
assert.match(legacyLayout, /install --directory --owner=root --group=root --mode=0700 "\$\{LEGACY_BACKUP_DIR\}"/);
assert.doesNotMatch(legacyLayout, /setfacl|postgres/);
assert.match(backupAccessPolicy, /getfacl --absolute-names --omit-header -- "\$\{directory\}"/);
assert.match(backupAccessPolicy, /grep --fixed-strings --line-regexp --quiet 'user:postgres:--x'/);
assert.match(backupAccessPolicy, /stat --format='%U:%G:%a' "\$\{PG_BACKUP_DIR\}"\) == "postgres:postgres:750"/);
assert.match(backupAccessPolicy, /stat --format='%U:%G:%a' "\$\{LEGACY_BACKUP_DIR\}"\) == "root:root:700"/);
assert.match(backupAccessPolicy, /postgres_can_chdir "\$\{directory\}" \|\| return 1/);
assert.match(backupAccessPolicy, /if postgres_can_list_directory "\$\{directory\}"; then/);
assert.match(backupAccessPolicy, /postgres_write_probe "\$\{directory\}" \|\| probe_status=\$\?/);
assert.match(backupAccessPolicy, /postgres_can_chdir "\$\{PG_BACKUP_DIR\}" \|\| return 1/);
assert.match(backupAccessPolicy, /postgres_write_probe "\$\{PG_BACKUP_DIR\}" \|\| return 1/);
assert.match(backupAccessPolicy, /if postgres_can_chdir "\$\{LEGACY_BACKUP_DIR\}"; then/);
assert.match(backupAccessPolicy, /if postgres_can_list_directory "\$\{LEGACY_BACKUP_DIR\}"; then/);
assert.match(backupAccessPolicy, /postgres_write_probe "\$\{LEGACY_BACKUP_DIR\}" \|\| probe_status=\$\?/);
assert.match(postgresChdirProbe, /runuser --user=postgres -- \/usr\/bin\/env --chdir="\$\{directory\}" \/usr\/bin\/true/);
assert.match(postgresListProbe, /runuser --user=postgres -- \/usr\/bin\/ls -- "\$\{directory\}"/);
assert.match(postgresWriteProbe, /runuser --user=postgres -- \/usr\/bin\/mktemp/);
assert.match(postgresWriteProbe, /\.ocg-db-helper-permission-check\.XXXXXX/);
assert.match(postgresWriteProbe, /rm --force -- "\$\{access_probe\}"/);
assert.match(backupAccessState, /postgres_backup_access_policy_valid/);
assert.match(validateBackupAccess, /postgres_backup_access_policy_valid/);
assert.match(audit, /backup_status/);
assert.doesNotMatch(backupAccessPolicy, /\/usr\/bin\/test -[rwx]/);
assert.doesNotMatch(postgresChdirProbe + postgresListProbe + postgresWriteProbe, /\b(?:bash|sh)\b|\beval\b/);
assert.match(helper, /apt-get install --yes --no-install-recommends[\s\\]+[\s\S]* acl/);
assert.match(backupStatus, /postgres_backup_access_state/);
assert.doesNotMatch(copyLegacySnapshot, /postgres|PG_BACKUP_DIR|DATABASE_URL/);
assert.match(legacyBackup, /ensure_legacy_backup_layout/);
assert.doesNotMatch(legacyBackup, /postgres|PG_BACKUP_DIR|DATABASE_URL|ensure_postgres_backup_layout/);
assert.doesNotMatch(backupStatus, /runuser|postgres_(?:psql|scalar)|pg_(?:dump|restore|isready)|ensure_.*backup_layout/);
assert.doesNotMatch(audit, /ensure_.*backup_layout|require_bootstrap|require_managed_database_url/);
assert.match(audit, /if postgres_installed; then[\s\S]*postgres_scalar/);
assert.ok(
  bootstrap.indexOf("install_postgres_packages") < bootstrap.indexOf("ensure_postgres_backup_layout"),
  "bootstrap must install PostgreSQL before preparing its backup directory"
);
assert.ok(
  bootstrap.indexOf("ensure_postgres_backup_layout") < bootstrap.indexOf("validate_postgres_setup"),
  "bootstrap must apply its idempotent ACL before validating PostgreSQL"
);
assert.ok(
  bootstrap.indexOf("validate_postgres_setup") < bootstrap.indexOf("systemctl enable --now"),
  "bootstrap must validate backup access before enabling the backup timer"
);
assert.ok(
  backupNow.indexOf("require_bootstrap") < backupNow.indexOf("runuser --user=postgres"),
  "backup-now must require successful bootstrap before using the postgres Unix user"
);
assert.match(helper, /runuser --user="\$\{ADMIN_USER\}" -- \/usr\/bin\/test -w/);
assert.match(helper, /EnvironmentFile=\$\{migration_env\}/);
assert.match(helper, /PROFILE_STORAGE_BACKEND" "POSTGRESQL"/);
assert.match(helper, /DATABASE_REQUIRED" "1"/);
assert.match(migrationRunner, /schema_migrations/);
assert.match(migrationRunner, /pg_advisory_lock/);
assert.match(migrationRunner, /checksum_sha256/);
assert.match(backupService, /^ExecStart=\/usr\/local\/sbin\/ocg-db-helper backup-now$/m);
assert.match(backupService, /^ProtectSystem=strict$/m);
assert.match(backupTimer, /^Persistent=true$/m);
assert.match(backupTimer, /^Unit=office-card-game-db-backup\.service$/m);

const unsafeNames = ["../../etc", "/tmp/release", "v1.2.3-deadbeef/..", "v1.2.3-DEADBEEF", "v1.2-deadbeef", "v1.2.3-deadbeef;id", "v1.2.3-deadbeef extra"];
const releaseNamePattern = /^v[0-9]+\.[0-9]+\.[0-9]+-[0-9a-f]{8}$/;
for (const name of unsafeNames) assert.equal(releaseNamePattern.test(name), false, `unsafe release name accepted: ${name}`);
assert.equal(releaseNamePattern.test("v7.69.45-deadbeef"), true);
if (hasBash) {
  const helperPath = fileURLToPath(new URL("../ops/ocg-db-helper", import.meta.url));
  for (const name of unsafeNames) {
    const result = spawnSync("bash", [helperPath, "migrate", name], { encoding:"utf8" });
    assert.notEqual(result.status, 0, `unsafe release name accepted: ${name}`);
    assert.match(result.stderr, /Invalid release name/);
  }
  const extraArgument = spawnSync("bash", [helperPath, "audit", "unexpected"], { encoding:"utf8" });
  assert.equal(extraArgument.status, 64);
  assert.match(extraArgument.stderr, /Usage:/);
}

const runnerPath = fileURLToPath(new URL("../scripts/db-migrate.mjs", import.meta.url));
const runnerNoEnv = spawnSync(process.execPath, [runnerPath], { encoding:"utf8", env:{ ...process.env, DATABASE_URL:"" } });
if (runnerNoEnv.error?.code === "EPERM") {
  console.warn("DB_OPS_STATIC_CHECK_NOTE · sandbox blocks child processes; direct runner rejection checks are required separately");
} else {
  assert.ifError(runnerNoEnv.error);
  assert.notEqual(runnerNoEnv.status, 0);
  assert.match(runnerNoEnv.stderr, /DATABASE_URL is required/);
  const runnerUnsafeUrl = spawnSync(process.execPath, [runnerPath], {
    encoding:"utf8",
    env:{ ...process.env, DATABASE_URL:"postgresql://office_card_game_app:" + "a".repeat(64) + "@db.example.com:5432/office_card_game" }
  });
  assert.ifError(runnerUnsafeUrl.error);
  assert.notEqual(runnerUnsafeUrl.status, 0);
  assert.match(runnerUnsafeUrl.stderr, /fixed loopback PostgreSQL/);
}

console.log("DB_OPS_STATIC_CHECK_OK · helper syntax, sudoers scope, fixed paths, and release validation verified");
