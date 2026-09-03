import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { normalizeEmail } from "../server/account-service.mjs";
import { parseOfficeCardGameDatabaseUrl } from "../server/storage/database-url.mjs";

const { Client } = pg;
const COMMAND_ROLES = Object.freeze({ "grant-ops":"OPS", "grant-admin":"ADMIN" });

export function operationsRoleForCommand(value) {
  const role = COMMAND_ROLES[String(value ?? "")];
  if (!role) throw new Error("Command must be grant-ops or grant-admin");
  return role;
}

export async function grantInitialOperationsRole(options) {
  const databaseUrl = String(options.databaseUrl ?? "");
  parseOfficeCardGameDatabaseUrl(databaseUrl, { test:options.testDatabase === true });
  const email = normalizeEmail(options.email);
  const role = operationsRoleForCommand(options.command);
  const ClientClass = options.ClientClass ?? Client;
  const client = new ClientClass({
    connectionString:databaseUrl,
    connectionTimeoutMillis:10_000,
    application_name:"office-card-game-account-role-bootstrap"
  });
  try {
    await client.connect();
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT id, email_normalized, status, role FROM public.users WHERE email_normalized = $1 FOR UPDATE",
      [email]
    );
    const account = result.rows[0];
    if (!account) throw new Error("ACCOUNT_NOT_FOUND");
    if (account.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");
    if (account.role !== "PLAYER" && account.role !== role) throw new Error("ACCOUNT_ALREADY_PRIVILEGED");
    let changed = false;
    if (account.role === "PLAYER") {
      await client.query("UPDATE public.users SET role = $2, updated_at = now() WHERE id = $1", [account.id, role]);
      changed = true;
    }
    await client.query("COMMIT");
    return { accountId:String(account.id), email, role, changed };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: account-role.mjs <grant-ops|grant-admin> <email>");
    const result = await grantInitialOperationsRole({
      databaseUrl:process.env.DATABASE_URL,
      command:process.argv[2],
      email:process.argv[3]
    });
    console.log(`ACCOUNT_ROLE_BOOTSTRAP_OK email=${result.email} role=${result.role} changed=${result.changed}`);
  } catch (error) {
    console.error("ACCOUNT_ROLE_BOOTSTRAP_FAILED", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  }
}
