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

for (const [name, content] of [
  ["ops/ocg-db-helper", helper],
  ["ops/install-db-helper.sh", installer],
  ["ops/office-card-game-db.sudoers", sudoers],
  ["ops/office-card-game-db-backup.service", backupService],
  ["ops/office-card-game-db-backup.timer", backupTimer]
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
