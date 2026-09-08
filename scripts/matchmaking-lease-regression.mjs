import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { runMigrations } from "./db-migrate.mjs";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
if (!databaseUrl) throw new Error("OCG_TEST_DATABASE_URL is required; no matchmaking lease integration test was run");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = mkdtempSync(join(tmpdir(), "ocg-matchmaking-lease-"));
const port = 9790 + (process.pid % 300);
const { Client } = pg;
const admin = new Client({ connectionString:databaseUrl, application_name:"ocg-matchmaking-lease-regression" });
let child = null;
let logs = "";

function ownershipFor(deck) {
  const owned = {};
  for (const entry of deck.cards) owned[entry.definitionId] = Number(entry.copies);
  return owned;
}
async function waitReady(base) {
  for (let i = 0; i < 50; i += 1) {
    try { const response = await fetch(`${base}/api/ready`); if (response.ok && (await response.json()).ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`lease regression server did not become ready: ${logs}`);
}

try {
  await admin.connect();
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await runMigrations({ databaseUrl, testDatabase:true });
  const env = { ...process.env, NODE_ENV:"test", PROFILE_STORAGE_BACKEND:"POSTGRES", DATABASE_REQUIRED:"1", DATABASE_URL:databaseUrl, MATCHMAKING_LEASE_MS:"200", PORT:String(port), PUBLIC_BASE_URL:`http://127.0.0.1:${port}`, ADMIN_TOKEN:"lease-regression-admin", REQUIRE_HTTPS:"0", TRUST_PROXY:"0", RUNTIME_DIR:runtimeDir, ROOM_STORE_PATH:join(runtimeDir,"rooms.json"), MATCHMAKING_STORE_PATH:join(runtimeDir,"matchmaking.json"), PLAYER_STORE_PATH:join(runtimeDir,"players.json"), GUEST_CREDENTIAL_STORE_PATH:join(runtimeDir,"credentials.json"), PROFILE_STORE_PATH:join(runtimeDir,"profiles.json"), PLAYTEST_FEEDBACK_STORE_PATH:join(runtimeDir,"feedback.json") };
  child = spawn(process.execPath, [join(root, "server", "server.mjs")], { cwd:root, env, stdio:["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => { logs += String(chunk); });
  child.stderr.on("data", (chunk) => { logs += String(chunk); });
  const base = `http://127.0.0.1:${port}`;
  await waitReady(base);
  const post = (path, body, cookie = "") => fetch(`${base}${path}`, { method:"POST", headers:{ "content-type":"application/json", origin:base, ...(cookie ? { cookie } : {}) }, body:JSON.stringify(body) });
  const get = (path, cookie = "") => fetch(`${base}${path}`, { headers:{ origin:base, ...(cookie ? { cookie } : {}) } });
  const register = async (suffix) => {
    const response = await post("/api/auth/register", { email:`lease-${suffix}-${process.pid}@example.test`, password:"valid-password-lease" });
    assert.equal(response.status, 201);
    return { cookie:String(response.headers.get("set-cookie")).split(";")[0], id:(await response.json()).account.id };
  };
  const deck = JSON.parse(readFileSync(join(root, "data", "decks.json"), "utf8"))[0];
  const a = await register("a");
  const b = await register("b");
  const c = await register("c");
  for (const account of [a, b, c]) {
    await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(jsonb_set(profile_data, '{meta,collectionMode}', '\"OWNED_COPIES\"'::jsonb, true), '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [account.id, JSON.stringify(ownershipFor(deck))]);
    assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:`lease-${account.id}`, name:"Lease Deck", cards:deck.cards }] }, account.cookie)).status, 200);
  }
  const queuedA = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:`lease-${a.id}` }, a.cookie);
  assert.equal(queuedA.status, 202);
  const ticketA = (await queuedA.json()).ticket;
  await delay(260);
  const queuedB = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:`lease-${b.id}` }, b.cookie);
  assert.equal(queuedB.status, 202);
  const expiredA = await (await get(`/api/matchmaking/status?ticketId=${encodeURIComponent(ticketA.ticketId)}`, a.cookie)).json();
  assert.equal(expiredA.ticket.status, "EXPIRED");
  assert.equal(expiredA.ticket.expiredReason, "QUEUE_LEASE_EXPIRED");
  const roomsAfterExpiry = existsSync(join(runtimeDir, "rooms.json")) ? JSON.parse(readFileSync(join(runtimeDir, "rooms.json"), "utf8")) : { rooms:[] };
  assert.equal((roomsAfterExpiry.rooms ?? []).length, 0);

  const active = await post("/api/matchmaking/enqueue", { mode:"FRIENDLY", deckId:`lease-${a.id}` }, a.cookie);
  assert.equal(active.status, 202);
  const activeTicket = (await active.json()).ticket;
  const unauthorized = await get(`/api/matchmaking/status?ticketId=${encodeURIComponent(activeTicket.ticketId)}`, b.cookie);
  assert.equal(unauthorized.status, 403);
  for (let i = 0; i < 8; i += 1) {
    await delay(50);
    const heartbeat = await get(`/api/matchmaking/status?ticketId=${encodeURIComponent(activeTicket.ticketId)}`, a.cookie);
    assert.equal(heartbeat.status, 200);
    assert.equal((await heartbeat.json()).ticket.status, "WAITING");
  }
  const matched = await post("/api/matchmaking/enqueue", { mode:"FRIENDLY", deckId:`lease-${c.id}` }, c.cookie);
  assert.equal(matched.status, 200);
  assert.equal((await matched.json()).ticket.status, "MATCHED");
  console.log("MATCHMAKING_LEASE_HTTP_PG_REGRESSION OK · expiry · owner heartbeat · no stale room · explicit live match");
} finally {
  if (child) child.kill("SIGTERM");
  await delay(100);
  await admin.end().catch(() => {});
  rmSync(runtimeDir, { recursive:true, force:true });
}
