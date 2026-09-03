import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { parseOfficeCardGameDatabaseUrl } from "../server/storage/database-url.mjs";
import { discoverMigrations, migrationStatus } from "../server/storage/migration-files.mjs";

const { Client } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultMigrationDir = resolve(root, "db/migrations");

export async function runMigrations(options) {
  const databaseUrl = String(options.databaseUrl ?? "");
  parseOfficeCardGameDatabaseUrl(databaseUrl, { test:options.testDatabase === true });
  const migrations = discoverMigrations(options.migrationDir ?? defaultMigrationDir);
  const ClientClass = options.ClientClass ?? Client;
  const client = new ClientClass({ connectionString:databaseUrl, connectionTimeoutMillis:10000, application_name:"office-card-game-migrations" });
  let locked = false;
  try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", ["office-card-game-schema-migrations"]);
    locked = true;
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version text PRIMARY KEY,
      checksum_sha256 char(64) NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const before = await migrationStatus(client, migrations);
    if (before.changed.length) throw new Error("Applied migration history does not match this release");
    let applied = 0;
    for (const migration of migrations) {
      if (!before.missing.includes(migration.name)) continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO public.schema_migrations(version, checksum_sha256) VALUES ($1, $2)", [migration.name, migration.checksum]);
        await client.query("COMMIT");
        applied += 1;
        options.log?.(`migration ${migration.name} applied`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    const after = await migrationStatus(client, migrations);
    if (!after.current) throw new Error("Migration set is not current after migration run");
    return { applied, total:after.applied, status:after };
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", ["office-card-game-schema-migrations"]).catch(() => {});
    await client.end().catch(() => {});
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  try {
    if (process.argv.length !== 2) throw new Error("db-migrate accepts no command-line arguments");
    const result = await runMigrations({ databaseUrl:process.env.DATABASE_URL, log:console.log });
    console.log(`MIGRATIONS_OK applied=${result.applied} total=${result.total}`);
  } catch (error) {
    console.error("MIGRATIONS_FAILED", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  }
}
