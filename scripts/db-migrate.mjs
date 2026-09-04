import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = resolve(root, "db/migrations");
const migrationNamePattern = /^[0-9]{4}_[a-z0-9_]+\.sql$/;
const databaseUrl = String(process.env.DATABASE_URL ?? "");

if (process.argv.length !== 2) throw new Error("db-migrate accepts no command-line arguments");
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const parsed = new URL(databaseUrl);
if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
if (parsed.hostname !== "127.0.0.1" || (parsed.port || "5432") !== "5432") throw new Error("DATABASE_URL must use fixed loopback PostgreSQL");
if (decodeURIComponent(parsed.username) !== "office_card_game_app") throw new Error("DATABASE_URL has the wrong application role");
if (decodeURIComponent(parsed.pathname.slice(1)) !== "office_card_game") throw new Error("DATABASE_URL has the wrong database");
if (!/^[0-9a-f]{64}$/.test(decodeURIComponent(parsed.password))) throw new Error("DATABASE_URL credential is not helper-managed");
if (!existsSync(migrationDir)) throw new Error("db/migrations is missing");

const migrations = readdirSync(migrationDir, { withFileTypes:true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

if (migrations.length === 0) throw new Error("No versioned SQL migrations were found");
for (const name of migrations) {
  if (!migrationNamePattern.test(name)) throw new Error(`Invalid migration filename: ${name}`);
}
if (new Set(migrations.map((name) => name.slice(0, 4))).size !== migrations.length) {
  throw new Error("Migration numeric prefixes must be unique");
}

const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const chunks = [
  "\\set ON_ERROR_STOP on",
  "SELECT pg_advisory_lock(hashtextextended('office-card-game-schema-migrations', 0));",
  "CREATE TABLE IF NOT EXISTS public.schema_migrations (version text PRIMARY KEY, checksum_sha256 char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());"
];

for (const name of migrations) {
  const path = resolve(migrationDir, name);
  if (dirname(path) !== migrationDir) throw new Error(`Migration escaped its fixed directory: ${name}`);
  const sql = readFileSync(path, "utf8");
  if (/^\s*\\/m.test(sql)) throw new Error(`Migration may not contain psql meta-commands: ${name}`);
  if (/^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;\s*(?:--.*)?$/im.test(sql)) throw new Error(`Migration transaction control is runner-owned: ${name}`);
  const checksum = createHash("sha256").update(sql).digest("hex");
  chunks.push(
    `DO $migration_check$ BEGIN IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = ${quoteLiteral(name)} AND checksum_sha256 <> ${quoteLiteral(checksum)}) THEN RAISE EXCEPTION 'Migration checksum mismatch: ${name}'; END IF; END $migration_check$;`,
    `SELECT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = ${quoteLiteral(name)}) AS already_applied \\gset`,
    "\\if :already_applied",
    `\\echo migration ${name} already applied`,
    "\\else",
    "BEGIN;",
    sql,
    `INSERT INTO public.schema_migrations(version, checksum_sha256) VALUES (${quoteLiteral(name)}, ${quoteLiteral(checksum)});`,
    "COMMIT;",
    `\\echo migration ${name} applied`,
    "\\endif"
  );
}
chunks.push("SELECT pg_advisory_unlock(hashtextextended('office-card-game-schema-migrations', 0));");

const childEnv = {
  PATH: "/usr/bin:/bin",
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || "5432",
  PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGAPPNAME: "office-card-game-migrations",
  PGCONNECT_TIMEOUT: "10",
  PGSSLMODE: "disable"
};
const result = spawnSync("/usr/bin/psql", ["--no-psqlrc", "--set=ON_ERROR_STOP=1", "--file=-"], {
  cwd: root,
  env: childEnv,
  input: `${chunks.join("\n")}\n`,
  encoding: "utf8",
  stdio: ["pipe", "inherit", "inherit"]
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
