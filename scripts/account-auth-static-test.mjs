import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import { AccountError, hashOpaqueToken, isOperationsRole, normalizeEmail, parseCookies, PasswordWorkGate, sessionCookie, validatePassword } from "../server/account-service.mjs";
import { buildOperationsOverview, operationsSection } from "../server/operations-status.mjs";
import { parseOfficeCardGameDatabaseUrl, normalizePersistenceBackend } from "../server/storage/database-url.mjs";
import { discoverMigrations, migrationStatus } from "../server/storage/migration-files.mjs";
import { operationsRoleForCommand } from "./account-role.mjs";

assert.equal(normalizeEmail("  Employee@Example.COM  "), "employee@example.com");
for (const invalid of ["", "missing-at.example", "a@b", `${"x".repeat(250)}@e.co`]) assert.throws(() => normalizeEmail(invalid), AccountError);
assert.equal(validatePassword("correct horse battery"), "correct horse battery");
for (const invalid of ["short", "x".repeat(129), null]) assert.throws(() => validatePassword(invalid), AccountError);

const rawToken = "opaque-session-token";
assert.equal(hashOpaqueToken(rawToken).length, 64);
assert.equal(hashOpaqueToken(rawToken).includes(rawToken), false);
const cookie = sessionCookie(rawToken, { secure:true });
assert.match(cookie, /^ocg_session=/);
assert.match(cookie, /; Path=\//);
assert.match(cookie, /; HttpOnly/);
assert.match(cookie, /; SameSite=Lax/);
assert.match(cookie, /; Secure/);
assert.equal(parseCookies("theme=dark; ocg_session=abc.def; x=1").get("ocg_session"), "abc.def");
assert.match(sessionCookie("", { clear:true, secure:true }), /Max-Age=0/);

const hash = await argon2.hash("account-static-password", { type:argon2.argon2id, memoryCost:65536, timeCost:3, parallelism:1 });
assert.match(hash, /^\$argon2id\$/);
assert.equal(await argon2.verify(hash, "account-static-password"), true);
assert.equal(await argon2.verify(hash, "incorrect"), false);

let activePasswordWork = 0;
let maximumPasswordWork = 0;
const passwordWorkReleases = [];
const passwordWorkGate = new PasswordWorkGate({ concurrency:2, queueLimit:1 });
const holdPasswordWork = () => passwordWorkGate.run(async () => {
  activePasswordWork += 1;
  maximumPasswordWork = Math.max(maximumPasswordWork, activePasswordWork);
  await new Promise((resolve) => passwordWorkReleases.push(resolve));
  activePasswordWork -= 1;
});
const firstPasswordWork = holdPasswordWork();
const secondPasswordWork = holdPasswordWork();
const queuedPasswordWork = passwordWorkGate.run(async () => true);
await assert.rejects(() => passwordWorkGate.run(async () => true), (error) => error.code === "AUTH_BUSY");
await new Promise((resolve) => setImmediate(resolve));
assert.equal(maximumPasswordWork, 2);
for (const release of passwordWorkReleases.splice(0)) release();
await Promise.all([firstPasswordWork, secondPasswordWork, queuedPasswordWork]);

assert.equal(isOperationsRole("PLAYER"), false);
assert.equal(isOperationsRole("OPS"), true);
assert.equal(isOperationsRole("ADMIN"), true);
assert.equal(operationsRoleForCommand("grant-ops"), "OPS");
assert.equal(operationsRoleForCommand("grant-admin"), "ADMIN");
assert.throws(() => operationsRoleForCommand("set-role"));
assert.throws(() => operationsRoleForCommand("PLAYER"));
assert.equal(normalizePersistenceBackend(undefined), "FILE_JSON_LOCAL");
assert.equal(normalizePersistenceBackend("POSTGRES"), "POSTGRES");
assert.equal(normalizePersistenceBackend("POSTGRESQL"), "POSTGRES");
assert.throws(() => normalizePersistenceBackend("DATABASE_URL"));
assert.throws(() => parseOfficeCardGameDatabaseUrl("postgresql://office_card_game_app:secret@db.example.com/office_card_game"), /loopback/);
assert.throws(() => parseOfficeCardGameDatabaseUrl("postgresql://office_card_game_app:secret@127.0.0.1/office_card_game"), /helper-managed/);
assert.doesNotThrow(() => parseOfficeCardGameDatabaseUrl("postgresql://tester:secret@127.0.0.1:5432/office_card_game_test_accounts", { test:true }));

const fileOverview = buildOperationsOverview({
version:"7.69.55", environment:"Local", uptimeSeconds:12, nodeVersion:process.version,
  backend:"FILE_JSON_LOCAL", databaseRequired:false, persistence:{ database:{ configured:false, reachable:null }, migrations:{ current:null }, diagnostics:[] },
  legacyStorePresent:true, cutoverMarkerPresent:false, backups:{ database:{ status:"UNAVAILABLE" }, legacy:{ status:"UNAVAILABLE" }, retentionDays:30, timerStatus:"UNAVAILABLE" }
});
assert.equal(fileOverview.persistence.sourceOfTruth, "GUEST_FILE_JSON_LOCAL");
assert.equal(fileOverview.persistence.legacyImportState, "UNAVAILABLE");
assert.equal(fileOverview.database.status, "NOT_CONFIGURED");
assert.equal(fileOverview.cutover.readyForCutover, "NO");
assert.equal(fileOverview.cutover.state, "FILE_JSON_AUTHORITATIVE");
assert.equal(fileOverview.backups.database.status, "UNAVAILABLE");

const postgresOverview = buildOperationsOverview({
version:"7.69.55", releaseIdentifier:"v7.69.55-deadbeef", environment:"Production", uptimeSeconds:3600, nodeVersion:process.version,
  backend:"POSTGRES", databaseRequired:true, persistence:{
    database:{ configured:true, reachable:true, version:"18.6", schemaReady:true, pool:{ active:1, idle:2, waiting:0, max:10 } },
    migrations:{ current:true, applied:1, required:1, pending:[], changed:[], unknown:[] }, readiness:{ ok:true },
    legacyImport:{ state:"NOT_REQUIRED_ALPHA_RESET" },
    accounts:{ total:2, profiles:2, activeSessions:1, recent:[{ email:"ops@example.test", role:"OPS" }], recentProfiles:[{ displayName:"Employee TEST", email:"ops@example.test", level:2 }] }, progression:{ levels:[], rankedTiers:[] }, diagnostics:[]
  }, legacyStorePresent:true, cutoverMarkerPresent:true,
  backups:{ database:{ status:"OVERDUE", lastSuccessfulAt:1 }, legacy:{ status:"HEALTHY", lastSuccessfulAt:1 }, retentionDays:30, timerStatus:"UNAVAILABLE" }
});
assert.equal(postgresOverview.overall.app, "HEALTHY");
assert.equal(postgresOverview.overall.backup, "OVERDUE");
assert.equal(postgresOverview.overall.readiness, "READY");
assert.equal(postgresOverview.database.migrations.state, "CURRENT");
assert.equal(postgresOverview.cutover.readyForCutover, "YES");
assert.equal(postgresOverview.cutover.state, "POSTGRES_ACTIVE");
assert.equal(postgresOverview.persistence.legacyImportState, "NOT_REQUIRED_ALPHA_RESET");
const failedMigrationOverview = buildOperationsOverview({
version:"7.69.55", environment:"Production", backend:"POSTGRES", databaseRequired:true,
  persistence:{ database:{ configured:true, reachable:true }, migrations:{ current:false, changed:["0001_accounts_and_profiles.sql"] }, readiness:{ ok:false } },
  backups:{ database:{ status:"HEALTHY" }, legacy:{ status:"HEALTHY" }, retentionDays:30, timerStatus:"UNAVAILABLE" }
});
assert.equal(failedMigrationOverview.database.migrations.state, "FAILED");
assert.equal(failedMigrationOverview.overall.backup, "HEALTHY");
const unavailableDbOverview = buildOperationsOverview({
version:"7.69.55", environment:"Production", backend:"POSTGRES", databaseRequired:true,
  persistence:{ database:{ configured:true, reachable:false }, migrations:{ current:false }, readiness:{ ok:false } },
  backups:{ database:{ status:"WARNING" }, legacy:{ status:"HEALTHY" }, retentionDays:30, timerStatus:"UNAVAILABLE" }
});
assert.equal(unavailableDbOverview.database.status, "DEGRADED");
assert.equal(unavailableDbOverview.database.migrations.state, "UNKNOWN");
const mismatchOverview = buildOperationsOverview({
version:"7.69.55", environment:"Production", backend:"POSTGRES", databaseRequired:false,
  persistence:{ database:{ configured:true, reachable:true }, migrations:{ current:true }, readiness:{ ok:true } },
  backups:{ database:{ status:"HEALTHY" }, legacy:{ status:"HEALTHY" }, retentionDays:30, timerStatus:"UNAVAILABLE" }
});
assert.equal(mismatchOverview.diagnostics.some((item) => item.code === "POSTGRES_BACKEND_NOT_REQUIRED_BY_CONFIG"), true);
assert.deepEqual(Object.keys(operationsSection(postgresOverview, "database")), ["generatedAt", "database"]);
assert.equal(operationsSection(postgresOverview, "unknown"), null);
const serialized = JSON.stringify(postgresOverview);
for (const secret of ["DATABASE_URL", "password_hash", "token_hash", "ocg_session", "guest-credentials", "postgresql://"]) assert.equal(serialized.includes(secret), false, `Ops model leaked ${secret}`);

const temp = mkdtempSync(join(tmpdir(), "ocg-migrations-"));
try {
  assert.throws(() => discoverMigrations(temp), /No versioned SQL migrations/);
  writeFileSync(join(temp, "0001_bad.sql"), "BEGIN;\nSELECT 1;\n");
  assert.throws(() => discoverMigrations(temp), /transaction control/);
  rmSync(join(temp, "0001_bad.sql"));
  writeFileSync(join(temp, "0001_valid.sql"), "CREATE TABLE safe_probe(id bigint PRIMARY KEY);\n");
  const migrations = discoverMigrations(temp);
  assert.equal(migrations.length, 1);
  assert.equal(migrations[0].checksum.length, 64);
  const forwardCompatible = await migrationStatus({ query:async (sql) => sql.includes("to_regclass")
    ? { rows:[{ table_name:"schema_migrations" }] }
    : { rows:[{ version:migrations[0].name, checksum_sha256:migrations[0].checksum }, { version:"0002_future_additive.sql", checksum_sha256:"f".repeat(64) }] }
  }, migrations);
  assert.equal(forwardCompatible.current, true);
  assert.equal(forwardCompatible.exact, false);
  assert.deepEqual(forwardCompatible.unknown, ["0002_future_additive.sql"]);
} finally {
  rmSync(temp, { recursive:true, force:true });
}

const serverSource = readFileSync(new URL("../server/server.mjs", import.meta.url), "utf8");
const accountSource = readFileSync(new URL("../server/account-service.mjs", import.meta.url), "utf8");
const accountRoleSource = readFileSync(new URL("./account-role.mjs", import.meta.url), "utf8");
const dockerTestSource = readFileSync(new URL("./db-docker-test.mjs", import.meta.url), "utf8");
assert.match(serverSource, /requireOperationsAccount\(req\)/);
assert.match(serverSource, /\/api\/ops\/overview/);
assert.match(accountSource, /u\.role/);
assert.match(serverSource, /guestProfileServiceOptions = PROFILE_STORAGE_BACKEND === "POSTGRES"/);
assert.match(serverSource, /playerPersistence:undefined, credentialPersistence:undefined/);
assert.match(serverSource, /accountPersistenceAvailable:accountService\.readyState\.ok === true/);
assert.match(serverSource, /accountPersistenceConfigured:true/);
const clientSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
assert.match(clientSource, /function saveMetaProfile\(\) \{\s*if \(state\.account\) return;/);
assert.match(clientSource, /function saveCustomDecks\(\) \{\s*if \(state\.account\) return;/);
assert.match(clientSource, /loadMetaProfile\(\);\s*loadCustomDecks\(\);\s*await ensureServerProfile\(\);/);
assert.match(clientSource, /data-account-password-target/);
assert.match(clientSource, /aria-pressed/);
assert.match(clientSource, /form\.setAttribute\('aria-busy','true'\)/);
assert.match(clientSource, /if \(state\.authDialog\)/);
assert.match(clientSource, /document\.title=lobbyCopy\('Operations — Office Card Game'/);
assert.doesNotMatch(accountSource, /console\.(?:log|error)\([^\n]*(?:password|sessionToken|databaseUrl)/i);
assert.doesNotMatch(serverSource, /body\?\.(?:userId|profileId).*requireOperations/i);
assert.match(accountRoleSource, /"grant-ops":"OPS", "grant-admin":"ADMIN"/);
assert.match(accountRoleSource, /WHERE email_normalized = \$1 FOR UPDATE/);
assert.match(accountRoleSource, /account\.role !== "PLAYER"/);
assert.doesNotMatch(accountRoleSource, /\b(?:eval|exec|execFile|spawn|system)\s*\(/);
assert.doesNotMatch(accountRoleSource, /process\.argv\[[^\]]+\].*(?:query|connectionString)/);
assert.match(dockerTestSource, /const host = "127\.0\.0\.1"/);
assert.match(dockerTestSource, /const image = "postgres:18"/);
assert.match(dockerTestSource, /--publish", `\$\{host\}:\$\{port\}:5432`/);
assert.match(dockerTestSource, /OCG_TEST_DATABASE_URL:databaseUrl/);
assert.match(dockerTestSource, /delete testEnvironment\.DATABASE_URL/);
assert.match(dockerTestSource, /finally \{\s*cleanup\(\);/);
assert.doesNotMatch(dockerTestSource, /shell:true|eval\s*\(/);

console.log("ACCOUNT_AUTH_STATIC_OK · Argon2id, cookies, backend selection, migrations, and safe Ops contract verified");
