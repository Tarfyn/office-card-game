import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const migrationNamePattern = /^[0-9]{4}_[a-z0-9_]+\.sql$/;
const forbiddenMetaCommand = /^\s*\\/m;
const forbiddenTransactionControl = /^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;\s*(?:--.*)?$/im;

export function discoverMigrations(migrationDir) {
  const fixedDir = resolve(migrationDir);
  if (!existsSync(fixedDir)) throw new Error("db/migrations is missing");
  const sqlEntries = readdirSync(fixedDir, { withFileTypes:true }).filter((entry) => entry.name.endsWith(".sql"));
  if (sqlEntries.some((entry) => !entry.isFile())) throw new Error("Migration entries must be regular files");
  const names = sqlEntries.map((entry) => entry.name).sort();
  if (names.length === 0) throw new Error("No versioned SQL migrations were found");
  for (const name of names) if (!migrationNamePattern.test(name)) throw new Error(`Invalid migration filename: ${name}`);
  if (new Set(names.map((name) => name.slice(0, 4))).size !== names.length) throw new Error("Migration numeric prefixes must be unique");
  return names.map((name) => {
    const path = resolve(fixedDir, name);
    if (dirname(path) !== fixedDir) throw new Error(`Migration escaped its fixed directory: ${name}`);
    const sql = readFileSync(path, "utf8");
    if (!sql.trim()) throw new Error(`Migration is empty: ${name}`);
    if (forbiddenMetaCommand.test(sql)) throw new Error(`Migration may not contain psql meta-commands: ${name}`);
    if (forbiddenTransactionControl.test(sql)) throw new Error(`Migration transaction control is runner-owned: ${name}`);
    return { name, sql, checksum:createHash("sha256").update(sql).digest("hex") };
  });
}

export async function migrationStatus(client, migrations) {
  const table = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");
  if (!table.rows[0]?.table_name) return { current:false, applied:0, required:migrations.length, missing:migrations.map((entry) => entry.name), changed:[], unknown:[] };
  const appliedResult = await client.query("SELECT version, checksum_sha256 FROM public.schema_migrations ORDER BY version");
  const applied = new Map(appliedResult.rows.map((row) => [String(row.version), String(row.checksum_sha256)]));
  const requiredNames = new Set(migrations.map((entry) => entry.name));
  const missing = migrations.filter((entry) => !applied.has(entry.name)).map((entry) => entry.name);
  const changed = migrations.filter((entry) => applied.has(entry.name) && applied.get(entry.name) !== entry.checksum).map((entry) => entry.name);
  const unknown = [...applied.keys()].filter((name) => !requiredNames.has(name));
  // A release is compatible when every migration it knows is present with the
  // expected checksum. Additive migrations from a newer release are reported
  // separately but do not prevent a code rollback from becoming ready.
  const current = missing.length === 0 && changed.length === 0;
  return { current, exact:current && unknown.length === 0, applied:applied.size, required:migrations.length, missing, changed, unknown };
}
