import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { runMigrations } from "./db-migrate.mjs";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
const container = String(process.env.OCG_TEST_DB_CONTAINER ?? "");
if (!databaseUrl || !container) throw new Error("OCG_TEST_DATABASE_URL and OCG_TEST_DB_CONTAINER are required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = join(tmpdir(), `ocg-alpha-reset-recovery-${process.pid}`);
const runtime = join(work, "runtime");
const state = join(work, "state");
const snapshot = join(work, "legacy-snapshot");
const backup = join(work, "backup.dump");
const epoch = `alpha-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
const cutoff = new Date().toISOString();
const confirmation = `ALPHA_RESET:${epoch}`;
const originalRooms = { version:1, rooms:[{ roomId:"recovery-fixture", status:"WAITING" }] };
const originalTickets = { version:1, tickets:[{ ticketId:"recovery-fixture", status:"WAITING" }] };
const cliArgs = ["--apply", `--epoch=${epoch}`, `--cutoff=${cutoff}`, `--confirm=${confirmation}`, `--backup=${backup}`, `--legacy-snapshot=${snapshot}`, `--runtime-dir=${runtime}`, `--state-dir=${state}`, `--pg-restore-container=${container}`];

function run(args) {
  const result = spawnSync(process.execPath, [join(root, "scripts", "alpha-reset.mjs"), ...args], {
    cwd:root,
    env:{ ...process.env, OCG_ALPHA_RESET_TEST:"1" },
    encoding:"utf8",
    shell:false
  });
  if (result.error) throw result.error;
  return result;
}

mkdirSync(snapshot, { recursive:true });
mkdirSync(runtime, { recursive:true });
writeFileSync(join(snapshot, "rooms.local.json"), `${JSON.stringify(originalRooms)}\n`);
writeFileSync(join(snapshot, "matchmaking.local.json"), `${JSON.stringify(originalTickets)}\n`);
writeFileSync(join(runtime, "rooms.local.json"), `${JSON.stringify(originalRooms)}\n`);
writeFileSync(join(runtime, "matchmaking.local.json"), `${JSON.stringify(originalTickets)}\n`);
writeFileSync(backup, "disposable backup reference\n");

const admin = new pg.Client({ connectionString:databaseUrl, application_name:"office-card-game-alpha-reset-recovery-regression" });
await admin.connect();
try {
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await runMigrations({ databaseUrl, testDatabase:true });
  const dump = spawnSync("docker", ["exec", container, "pg_dump", "-U", "ocg_test", "-d", "office_card_game_test_accounts", "-Fc", "-f", "/tmp/f04.dump"], { encoding:"utf8", shell:false });
  if (dump.error) throw dump.error;
  if (dump.status !== 0) throw new Error(`fixture pg_dump failed: ${String(dump.stderr || dump.stdout).trim()}`);
  const failed = run([...cliArgs, "--fail-after=RUNTIME_REINITIALIZED"]);
  assert.notEqual(failed.status, 0, "injected interruption must fail");
  const recoveryState = JSON.parse(readFileSync(join(state, "alpha-reset-state.json"), "utf8"));
  assert.equal(recoveryState.phase, "RECOVERY_REQUIRED", `${failed.stdout}\n${failed.stderr}`);
  assert.deepEqual(JSON.parse(readFileSync(join(runtime, "rooms.local.json"), "utf8")), originalRooms);
  assert.deepEqual(JSON.parse(readFileSync(join(runtime, "matchmaking.local.json"), "utf8")), originalTickets);
  const resumed = run([...cliArgs, "--resume"]);
  assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
  assert.match(resumed.stdout, /"status":\s*"APPLIED"/);
  const completed = JSON.parse(readFileSync(join(state, "alpha-reset-state.json"), "utf8"));
  assert.equal(completed.phase, "COMPLETED");
  assert.deepEqual(JSON.parse(readFileSync(join(runtime, "rooms.local.json"), "utf8")), { version:1, rooms:[] });
  assert.deepEqual(JSON.parse(readFileSync(join(runtime, "matchmaking.local.json"), "utf8")), { version:1, tickets:[] });
  const repeated = run([...cliArgs, "--resume"]);
  assert.equal(repeated.status, 0);
  assert.match(repeated.stdout, /"status":\s*"ALREADY_APPLIED"/);
  console.log("ALPHA_RESET_RECOVERY_REGRESSION_OK · interruption · durable state · archive hash · resume · idempotency");
} finally {
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await admin.end();
  rmSync(work, { recursive:true, force:true });
}
