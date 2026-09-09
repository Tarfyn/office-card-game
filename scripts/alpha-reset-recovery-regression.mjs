import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { runMigrations } from "./db-migrate.mjs";
import { parseOfficeCardGameDatabaseUrl } from "../server/storage/database-url.mjs";
import { PostgresAccountService } from "../server/account-service.mjs";
import { createPlayerMetaProfile } from "../dist/src/economy.js";
import { createEmptyPlayerStats } from "../dist/src/match-history.js";
import { createRankedProfile } from "../dist/src/ranked.js";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
// Validate the disposable database contract BEFORE any SQL, including cleanup.
parseOfficeCardGameDatabaseUrl(databaseUrl, { test:true });
const container = String(process.env.OCG_TEST_DB_CONTAINER ?? "");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "ocg-alpha-reset-matrix-"));
const epoch = "alpha-20260909T100000Z";
const cutoff = "2026-09-09T10:00:00.000Z";
const oldTime = Date.parse("2026-09-08T10:00:00.000Z");
const tables = ["users", "sessions", "player_profiles", "player_decks", "reward_grants", "achievement_progress", "match_settlements", "persistence_metadata", "schema_migrations"];
const dropSql = "DROP TABLE IF EXISTS " + [...tables].reverse().map((table) => "public." + table).join(", ") + " CASCADE";
const originalRooms = { version:1, rooms:[{ roomId:"old-room", status:"FINISHED", completionStatus:"PENDING" }] };
const originalTickets = { version:1, tickets:[{ ticketId:"old-ticket", status:"WAITING" }] };
const names = ["rooms.local.json", "matchmaking.local.json"];
const emptyStores = [{ version:1, rooms:[] }, { version:1, tickets:[] }];
const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
const admin = new pg.Client({ connectionString:databaseUrl, application_name:"ocg-alpha-reset-matrix-disposable" });
const service = new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir:join(root, "db/migrations"), profileFactory:() => ({}) });
const sha = (data) => createHash("sha256").update(data).digest("hex");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));

function command(program, args) {
  const result = spawnSync(program, args, { cwd:root, encoding:"utf8", shell:false, timeout:60000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, program + " failed: " + result.stderr);
  return result;
}
function tree(path) {
  if (!existsSync(path)) return null;
  if (!lstatSync(path).isDirectory()) return sha(readFileSync(path));
  return Object.fromEntries(readdirSync(path).sort().map((name) => [name, tree(join(path, name))]));
}
function fixture(name) {
  const base = join(work, name);
  const runtime = join(base, "runtime");
  const snapshot = join(base, "snapshot");
  mkdirSync(runtime, { recursive:true });
  mkdirSync(snapshot);
  for (const dir of [runtime, snapshot]) names.forEach((file, i) => writeFileSync(join(dir, file), JSON.stringify([originalRooms, originalTickets][i]) + "\n"));
  const backup = join(base, "backup.dump");
  const stateDir = join(base, "state");
  const statePath = join(stateDir, "alpha-reset-state.json");
  const args = ["--apply", "--epoch=" + epoch, "--cutoff=" + cutoff, "--confirm=ALPHA_RESET:" + epoch, "--backup=" + backup, "--legacy-snapshot=" + snapshot, "--runtime-dir=" + runtime, "--state-dir=" + stateDir];
  if (container) args.push("--pg-restore-container=" + container);
  return { name, base, runtime, snapshot, backup, stateDir, statePath, args };
}
function run(f, { interrupt = null, extra = [], apply = true } = {}) {
  const env = { ...process.env, OCG_ALPHA_RESET_TEST:"1" };
  delete env.DATABASE_URL;
  delete env.OCG_TEST_RESET_STATE_PATH;
  delete env.OCG_TEST_RESET_INTERRUPT_PHASE;
  const nodeArgs = [];
  if (interrupt) {
    env.OCG_TEST_RESET_STATE_PATH = f.statePath;
    env.OCG_TEST_RESET_INTERRUPT_PHASE = interrupt;
    nodeArgs.push("--import", pathToFileURL(join(root, "scripts/test-support/alpha-reset-interrupt.mjs")).href);
  }
  nodeArgs.push(join(root, "scripts/alpha-reset.mjs"), ...f.args.filter((arg) => apply || arg !== "--apply"), ...extra);
  const result = spawnSync(process.execPath, nodeArgs, { cwd:root, env, encoding:"utf8", shell:false, timeout:60000 });
  if (result.error) throw result.error;
  return result;
}
async function databaseSnapshot() {
  const result = {};
  for (const table of tables) {
    const rows = (await admin.query("SELECT to_jsonb(t) AS data, xmin::text AS transaction FROM public." + table + " t")).rows;
    result[table] = rows.sort((a, b) => JSON.stringify(stable(a.data)).localeCompare(JSON.stringify(stable(b.data))));
  }
  return result;
}
async function seed(f) {
  await admin.query(dropSql);
  await runMigrations({ databaseUrl, testDatabase:true });
  for (const [index, id] of ids.entries()) {
    const meta = createPlayerMetaProfile(["CS-001"], 4321, oldTime);
    meta.balances.SHREDDER_SCRAPS = 987;
    meta.progression.level = 8;
    meta.progression.matchesCompleted = 25;
    meta.achievements = { "fixture-achievement":{ value:9, completedAt:oldTime, claimedAt:oldTime } };
    meta.claimedRewardRooms = ["old-room"];
    meta.processedProgressionEventIds = ["old-event"];
    const deck = { id:"old-deck", name:"Old deck", cards:{ "CS-001":2 }, revision:3, createdAt:oldTime, updatedAt:oldTime };
    const profile = { playerId:id, profileId:id, displayName:"Synthetic QA", meta, stats:createEmptyPlayerStats(1000), ranked:createRankedProfile(), matchHistory:[{ roomId:"old-room" }], decks:[deck], selectedDeckId:deck.id, createdAt:oldTime, updatedAt:oldTime };
    await admin.query("INSERT INTO public.users(id,email,email_normalized,password_hash,role,created_at,updated_at) VALUES ($1,$2,$2,$3,$4,to_timestamp($5/1000.0),to_timestamp($5/1000.0))", [id, "matrix" + index + "@example.test", "synthetic-test-only-hash-not-a-login-credential", index ? "ADMIN" : "OPS", oldTime]);
    await admin.query("INSERT INTO public.player_profiles(user_id,profile_data,revision,created_at,updated_at) VALUES ($1,$2::jsonb,7,to_timestamp($3/1000.0),to_timestamp($3/1000.0))", [id, JSON.stringify(profile), oldTime]);
    await service.syncProfileProjections(admin, id, profile);
    await admin.query("INSERT INTO public.sessions(id,user_id,token_hash,created_at,last_used_at,expires_at) VALUES ($1,$1,$2,to_timestamp($3/1000.0),to_timestamp($3/1000.0),to_timestamp($3/1000.0)+interval '100 years')", [id, String(index + 1).repeat(64), oldTime]);
  }
  await admin.query("INSERT INTO public.match_settlements(settlement_id,match_id,settlement_kind,mode,profile_ids,settled_at) VALUES ('historical','historical','PROFILE_COMPLETION','RANKED',$1::jsonb,to_timestamp($2/1000.0))", [JSON.stringify(ids), oldTime]);
  if (container) {
    command("docker", ["exec", container, "pg_dump", "-U", "ocg_test", "-d", "office_card_game_test_accounts", "-Fc", "-f", "/tmp/f04.dump"]);
    command("docker", ["cp", container + ":/tmp/f04.dump", f.backup]);
  } else command("pg_dump", ["--dbname", databaseUrl, "-Fc", "-f", f.backup]);
  f.args.push("--backup-sha256=" + sha(readFileSync(f.backup)));
}
function archiveEvidence(f, state) {
  assert.equal(state.archive.artifacts.length, 2);
  return state.archive.artifacts.map((artifact, i) => {
    const info = lstatSync(artifact.archivePath);
    assert.ok(info.isFile() && !info.isSymbolicLink());
    assert.equal(info.size, artifact.bytes);
    assert.equal(sha(readFileSync(artifact.archivePath)), artifact.sha256);
    assert.deepEqual(readFileSync(artifact.archivePath), readFileSync(join(f.snapshot, names[i])));
    return { type:artifact.artifactType, sha256:artifact.sha256, bytes:artifact.bytes };
  });
}
function assertRuntime(f, reset) {
  names.forEach((name, i) => reset ? assert.deepEqual(json(join(f.runtime, name)), emptyStores[i]) : assert.deepEqual(readFileSync(join(f.runtime, name)), readFileSync(join(f.snapshot, name))));
}
function logicalFinal(db, f) {
  // Only SQL transaction IDs, actual execution timestamps and fixture paths vary.
  const output = {};
  for (const [table, rows] of Object.entries(db)) output[table] = rows.map(({ data }) => {
    const value = structuredClone(data);
    delete value.transaction;
    if (["player_profiles", "persistence_metadata", "achievement_progress"].includes(table)) delete value.updated_at;
    if (table === "sessions") value.revoked_at = value.revoked_at === null ? null : "REVOKED";
    if (table === "schema_migrations") delete value.applied_at;
    if (table === "persistence_metadata" && value.key === "alpha_reset") {
      delete value.value.appliedAt;
      value.value.backupReference = "VALIDATED_BACKUP";
      value.value.legacySnapshotReference = "VALIDATED_SNAPSHOT";
      value.value.runtimeArchive = archiveEvidence(f, { archive:value.value.runtimeArchive });
    }
    return value;
  });
  return output;
}
function assertPolicy(before, after) {
  assert.deepEqual(after.users, before.users, "identities and OPS/ADMIN roles preserved without writes");
  assert.deepEqual(after.schema_migrations, before.schema_migrations);
  assert.deepEqual(after.match_settlements, before.match_settlements);
  for (const row of after.player_profiles) {
    assert.equal(row.data.revision, 8, "one reset per profile");
    const p = row.data.profile_data;
    assert.equal(p.meta.balances.OFFICE_CREDITS, 500);
    assert.equal(p.meta.balances.SHREDDER_SCRAPS, 0);
    assert.equal(p.meta.progression.matchesCompleted, 0);
    assert.deepEqual(p.matchHistory, []);
    assert.equal(p.decks.length, 1);
    assert.notEqual(p.selectedDeckId, "old-deck");
    assert.equal(p.meta.starterOnboarding.status, "COMPLETE");
  }
  assert.ok(after.sessions.every((row) => row.data.revoked_at !== null));
  assert.equal(after.persistence_metadata[0].data.value.epochId, epoch);
  assert.equal(after.persistence_metadata[0].data.value.cutoffAt, cutoff);
}

let connected = false;
try {
  await admin.connect(); connected = true;
  console.log("RESET_MATRIX_PLATFORM " + process.platform + " " + process.version + " PostgreSQL " + (await admin.query("SHOW server_version")).rows[0].server_version);
  const clean = fixture("clean");
  await seed(clean);
  const beforeClean = await databaseSnapshot();
  const dryTree = tree(clean.base);
  assert.equal(run(clean, { apply:false }).status, 0);
  assert.deepEqual(await databaseSnapshot(), beforeClean, "dry run zero DB writes");
  assert.deepEqual(tree(clean.base), dryTree, "dry run zero filesystem writes");
  const cleanResult = run(clean);
  assert.equal(cleanResult.status, 0, cleanResult.stderr);
  const afterClean = await databaseSnapshot();
  assertPolicy(beforeClean, afterClean);
  assertRuntime(clean, true);
  const baseline = logicalFinal(afterClean, clean);
  console.log("CLEAN_RESET_PASS " + JSON.stringify({ profiles:2, sessionsRevoked:2, logicalSha256:digest(baseline), runtimeSha256:digest(names.map((name) => json(join(clean.runtime, name)))), archive:archiveEvidence(clean, json(clean.statePath)) }));

  for (const phase of ["PREPARED", "RUNTIME_ARCHIVED", "RUNTIME_REINITIALIZED", "DB_COMMITTED"]) {
    const f = fixture(phase);
    await seed(f);
    const before = await databaseSnapshot();
    const interrupted = run(f, { interrupt:phase });
    assert.equal(interrupted.status, 86, interrupted.stderr);
    const state = json(f.statePath);
    assert.equal(state.phase, phase);
    assertRuntime(f, ["RUNTIME_REINITIALIZED", "DB_COMMITTED"].includes(phase));
    if (phase === "PREPARED") {
      assert.equal(state.archive, undefined);
      assert.deepEqual(readdirSync(f.runtime).sort(), [...names].sort());
    } else archiveEvidence(f, state);
    const atBoundary = await databaseSnapshot();
    if (phase === "DB_COMMITTED") assertPolicy(before, atBoundary);
    else assert.deepEqual(atBoundary, before, "pre-DB boundary must preserve every row/xmin");
    const resumed = run(f, { extra:["--resume"] });
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(json(f.statePath).phase, "COMPLETED");
    assertRuntime(f, true);
    const after = await databaseSnapshot();
    assertPolicy(before, after);
    if (phase === "DB_COMMITTED") assert.deepEqual(after, atBoundary, "post-commit resume: zero row writes/second reset");
    assert.deepEqual(logicalFinal(after, f), baseline, "clean/resumed full logical state equivalence");
    const treeBeforeReplay = tree(f.base);
    const replay = run(f, { extra:["--resume"] });
    assert.equal(replay.status, 0, replay.stderr);
    assert.equal(JSON.parse(replay.stdout).status, "ALREADY_APPLIED");
    assert.deepEqual(await databaseSnapshot(), after, "completed replay zero DB writes");
    assert.deepEqual(tree(f.base), treeBeforeReplay, "completed replay zero runtime/archive/state writes");
    console.log("RESET_BOUNDARY_PASS " + phase + " new-process-resume clean-equivalence replay-zero-writes");
  }

  async function tamperCase(label, mutate) {
    const f = fixture("tamper-" + label);
    await seed(f);
    const before = await databaseSnapshot();
    assert.notEqual(run(f, { extra:["--fail-after=RUNTIME_REINITIALIZED"] }).status, 0);
    const state = json(f.statePath);
    assert.equal(state.phase, "RECOVERY_REQUIRED");
    assert.equal(state.recoveryFrom, "RUNTIME_REINITIALIZED");
    assert.equal(state.lastCompletedState, "RUNTIME_REINITIALIZED");
    archiveEvidence(f, state);
    await mutate(f, state);
    const beforeResumeTree = tree(f.base);
    const result = run(f, { extra:["--resume"] });
    const after = await databaseSnapshot();
    assert.notEqual(result.status, 0, label + " must refuse resume");
    assert.deepEqual(after, before, label + " must not mutate database");
    assert.deepEqual(tree(f.base), beforeResumeTree, label + " must not mutate runtime/state after refusal");
    assert.equal(json(f.statePath).phase, "RECOVERY_REQUIRED");
    console.log("ARCHIVE_TAMPER_PASS " + label + " exit=" + result.status);
    rmSync(f.base, { recursive:true, force:true });
  }
  await tamperCase("MISSING", (f, state) => { rmSync(state.archive.artifacts[0].archivePath); });
  await tamperCase("WRONG_SIZE", (f, state) => { writeFileSync(state.archive.artifacts[0].archivePath, "x"); });
  await tamperCase("WRONG_HASH_SAME_SIZE", (f, state) => { const path = state.archive.artifacts[0].archivePath; const bytes = readFileSync(path); bytes[0] = bytes[0] ^ 1; writeFileSync(path, bytes); });
  await tamperCase("OUTSIDE_ROOT", (f, state) => { const outside = join(f.base, "outside.txt"); writeFileSync(outside, "outside"); state.archive.artifacts[0].archivePath = outside; writeFileSync(f.statePath, JSON.stringify(state)); });
  await tamperCase("MISSING_HASH", (f, state) => { delete state.archive.artifacts[0].sha256; writeFileSync(f.statePath, JSON.stringify(state)); });
  await tamperCase("MISSING_BYTES", (f, state) => { delete state.archive.artifacts[0].bytes; writeFileSync(f.statePath, JSON.stringify(state)); });
  await tamperCase("MISSING_PATH", (f, state) => { delete state.archive.artifacts[0].archivePath; writeFileSync(f.statePath, JSON.stringify(state)); });
  await tamperCase("CHECKPOINT_INCONSISTENT", (f, state) => { state.recoveryFrom = "DB_COMMITTED"; state.lastCompletedState = "DB_COMMITTED"; writeFileSync(f.statePath, JSON.stringify(state)); });
  await tamperCase("IDENTITY_MISMATCH", (f, state) => { state.epochId = "alpha-20260909T100001Z"; writeFileSync(f.statePath, JSON.stringify(state)); });
  if (process.platform !== "win32") await tamperCase("SYMLINK", (f, state) => { const path = state.archive.artifacts[0].archivePath; const target = join(f.base, "symlink-target"); writeFileSync(target, "other"); rmSync(path); symlinkSync(target, path); });
  else console.log("ARCHIVE_TAMPER_SKIP SYMLINK windows-symlink-permission");

  const committed = fixture("tamper-after-db-commit");
  await seed(committed);
  const committedBefore = await databaseSnapshot();
  assert.notEqual(run(committed, { extra:["--fail-after=DB_COMMITTED"] }).status, 0);
  const committedState = json(committed.statePath);
  assert.equal(committedState.phase, "DB_COMMITTED");
  archiveEvidence(committed, committedState);
  const committedAfterDbCommit = await databaseSnapshot();
  rmSync(committedState.archive.artifacts[0].archivePath);
  const committedResume = run(committed, { extra:["--resume"] });
  assert.notEqual(committedResume.status, 0);
  const committedAfter = await databaseSnapshot();
  const committedRecovery = json(committed.statePath);
  assert.equal(committedRecovery.phase, "RECOVERY_REQUIRED");
  assert.equal(committedRecovery.dbAlreadyCommitted, true);
  assert.equal(committedRecovery.failureCode, "ARCHIVE_INTEGRITY_FAILED");
  assert.deepEqual(committedAfter, committedAfterDbCommit, "DB_COMMITTED archive tamper must not reapply DB reset");
  console.log("ARCHIVE_TAMPER_PASS DB_COMMITTED_POLICY refusal-with-db-already-committed");
  rmSync(committed.base, { recursive:true, force:true });
  console.log("ALPHA_RESET_FULL_RECOVERY_REGRESSION_OK");
} finally {
  if (connected) { await admin.query(dropSql); await admin.end(); }
  await service.close();
  // Only this process's mkdtemp fixture root is removed.
  rmSync(work, { recursive:true, force:true });
}
