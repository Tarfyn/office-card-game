const PRODUCTION_DATABASE = "office_card_game";
const PRODUCTION_ROLE = "office_card_game_app";

export function parseOfficeCardGameDatabaseUrl(value, options = {}) {
  const raw = String(value ?? "");
  if (!raw) throw new Error("DATABASE_URL is required");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is invalid");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
  if (parsed.hostname !== "127.0.0.1" || (parsed.port || "5432") !== "5432") {
    throw new Error("DATABASE_URL must use fixed loopback PostgreSQL");
  }
  const username = decodeURIComponent(parsed.username);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const password = decodeURIComponent(parsed.password);
  if (options.test === true) {
    if (!/^office_card_game_test(?:_[a-z0-9_]+)?$/.test(database)) throw new Error("Test database name must start with office_card_game_test");
    if (!username || !password) throw new Error("Test DATABASE_URL requires a username and password");
  } else {
    if (username !== PRODUCTION_ROLE) throw new Error("DATABASE_URL has the wrong application role");
    if (database !== PRODUCTION_DATABASE) throw new Error("DATABASE_URL has the wrong database");
    if (!/^[0-9a-f]{64}$/.test(password)) throw new Error("DATABASE_URL credential is not helper-managed");
  }
  return { connectionString:raw, hostname:parsed.hostname, port:Number(parsed.port || 5432), username, database };
}

export function normalizePersistenceBackend(value) {
  const normalized = String(value ?? "FILE_JSON_LOCAL").trim().toUpperCase();
  if (normalized === "FILE_JSON_LOCAL") return "FILE_JSON_LOCAL";
  // POSTGRESQL is accepted for compatibility with the already-installed helper foundation.
  if (normalized === "POSTGRES" || normalized === "POSTGRESQL") return "POSTGRES";
  throw new Error("PROFILE_STORAGE_BACKEND must be FILE_JSON_LOCAL or POSTGRES");
}

export const officeCardGameDatabaseContract = Object.freeze({
  hostname:"127.0.0.1",
  port:5432,
  database:PRODUCTION_DATABASE,
  role:PRODUCTION_ROLE
});
