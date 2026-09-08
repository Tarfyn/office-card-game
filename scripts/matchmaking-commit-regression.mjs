import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { runMigrations } from "./db-migrate.mjs";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
if (!databaseUrl) throw new Error("OCG_TEST_DATABASE_URL is required; no matchmaking integration test was run");
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeDir = mkdtempSync(join(tmpdir(), "ocg-matchmaking-runtime-"));
const deckData = JSON.parse(readFileSync(join(root, "data", "decks.json"), "utf8"));
const deckA = deckData[0];
const deckB = deckData[1] ?? deckData[0];
const port = 9390 + (process.pid % 400);
const { Client } = pg;
const admin = new Client({ connectionString:databaseUrl, application_name:"ocg-matchmaking-commit-regression" });
let child = null;
let serverLogs = "";

function ownershipFor(deck) {
  const owned = {};
  for (const entry of deck.cards) owned[entry.definitionId] = Number(entry.copies) + 0;
  owned["N-001"] = Number(owned["N-001"] ?? 0) + 1;
  return owned;
}

async function waitReady(base) {
  for (let i = 0; i < 50; i += 1) {
    try { const response = await fetch(`${base}/api/ready`); if (response.ok && (await response.json()).ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`matchmaking regression server did not become ready${serverLogs ? `: ${serverLogs}` : ""}`);
}

try {
  await admin.connect();
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await runMigrations({ databaseUrl, testDatabase:true });
  const env = { ...process.env, NODE_ENV:"test", PROFILE_STORAGE_BACKEND:"POSTGRES", DATABASE_REQUIRED:"1", DATABASE_URL:databaseUrl, PORT:String(port), PUBLIC_BASE_URL:`http://127.0.0.1:${port}`, ADMIN_TOKEN:"matchmaking-regression-admin", REQUIRE_HTTPS:"0", TRUST_PROXY:"0", RUNTIME_DIR:runtimeDir, ROOM_STORE_PATH:join(runtimeDir,"rooms.json"), MATCHMAKING_STORE_PATH:join(runtimeDir,"matchmaking.json"), PLAYER_STORE_PATH:join(runtimeDir,"players.json"), GUEST_CREDENTIAL_STORE_PATH:join(runtimeDir,"credentials.json"), PROFILE_STORE_PATH:join(runtimeDir,"profiles.json"), PLAYTEST_FEEDBACK_STORE_PATH:join(runtimeDir,"feedback.json") };
  child = spawn(process.execPath, [join(root, "server", "server.mjs")], { cwd:root, env, stdio:["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => { serverLogs += String(chunk); });
  child.stderr.on("data", (chunk) => { serverLogs += String(chunk); });
  const base = `http://127.0.0.1:${port}`;
  await waitReady(base);
  const post = async (path, body, cookie = "") => fetch(`${base}${path}`, { method:"POST", headers:{ "content-type":"application/json", origin:base, ...(cookie ? { cookie } : {}) }, body:JSON.stringify(body) });
  const get = async (path, cookie = "") => fetch(`${base}${path}`, { headers:{ origin:base, ...(cookie ? { cookie } : {}) } });
  const first = await post("/api/auth/register", { email:`matchmaking-a-${process.pid}@example.test`, password:"valid-password-1" });
  const second = await post("/api/auth/register", { email:`matchmaking-b-${process.pid}@example.test`, password:"valid-password-2" });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  const firstBody = await first.json(); const secondBody = await second.json();
  const cookieA = String(first.headers.get("set-cookie")).split(";")[0];
  const cookieB = String(second.headers.get("set-cookie")).split(";")[0];
  const aId = firstBody.account.id; const bId = secondBody.account.id;
  for (const [id, deck] of [[aId, deckA], [bId, deckB]]) {
    await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(jsonb_set(profile_data, '{meta,collectionMode}', '\"OWNED_COPIES\"'::jsonb, true), '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [id, JSON.stringify(ownershipFor(deck))]);
  }
  assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:"f06-a", name:"F06 A", cards:deckA.cards }] }, cookieA)).status, 200);
  assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:"f06-b", name:"F06 B", cards:deckB.cards }] }, cookieB)).status, 200);

  const queuedA = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-a" }, cookieA);
  const queuedAText = await queuedA.text();
  assert.equal(queuedA.status, 202, queuedAText);
  const ticketA = (await (async () => { const response = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-a" }, cookieA); return response; })());
  // The second enqueue is idempotent and returns the existing waiting ticket.
  assert.equal(ticketA.status, 202);
  const ticketAData = (await ticketA.json()).ticket;
  const requiredCard = deckA.cards[0].definitionId;
  const scrap = await post("/api/economy/scrap", { definitionId:requiredCard, copies:1, confirmDeckImpact:true }, cookieA);
  const scrapText = await scrap.text();
  assert.equal(scrap.status, 200, scrapText);
  const profileAfterScrap = await (await get("/api/profiles/me", cookieA)).json();
  assert.ok(Number(profileAfterScrap.profile.meta.ownedCards[requiredCard] ?? 0) < Number(deckA.cards[0].copies));

  const queuedB = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-b" }, cookieB);
  const queuedBText = await queuedB.text();
  assert.equal(queuedB.status, 200, queuedBText);
  const queuedBData = JSON.parse(queuedBText);
  assert.equal(queuedBData.ticket.status, "WAITING");
  const staleA = await (await get(`/api/matchmaking/status?ticketId=${encodeURIComponent(ticketAData.ticketId)}`, cookieA)).json();
  assert.equal(staleA.ticket.status, "INVALID");
  assert.equal(staleA.ticket.invalidReason, "DECK_STALE");
  const queueSnapshot = JSON.parse(readFileSync(join(runtimeDir, "matchmaking.json"), "utf8"));
  assert.equal(queueSnapshot.tickets.find((ticket) => ticket.ticketId === ticketAData.ticketId).status, "INVALID");
  const roomsSnapshot = existsSync(join(runtimeDir, "rooms.json")) ? JSON.parse(readFileSync(join(runtimeDir, "rooms.json"), "utf8")) : { rooms:[] };
  assert.equal((roomsSnapshot.rooms ?? []).filter((room) => room.settings?.mode === "RANKED").length, 0);

  // Restore only the missing ownership, then prove the exact queued snapshot
  // can pair normally without selecting a different current deck.
  await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(profile_data, '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [aId, JSON.stringify(ownershipFor(deckA))]);
  const requeuedA = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-a" }, cookieA);
  const requeuedAText = await requeuedA.text();
  assert.equal(requeuedA.status, 200, requeuedAText);
  const matched = JSON.parse(requeuedAText);
  assert.equal(matched.ticket.status, "MATCHED");
  assert.ok(matched.ticket.session?.roomId);
  const room = matched.ticket.session.view;
  assert.equal(room.hostDeckId, "f06-b");
  assert.equal(room.guestDeckId, "f06-a");
  const state = await (await get(`/api/rooms/${room.roomId}/state?token=${encodeURIComponent(matched.ticket.session.token)}&clientId=f06`, cookieA)).json();
  const finish = await post(`/api/rooms/${room.roomId}/intent?token=${encodeURIComponent(matched.ticket.session.token)}`, { intentId:"f06-resign", expectedStateVersion:state.match.stateVersion, intent:{ type:"RESIGN" } }, cookieA);
  const finishText = await finish.text();
  assert.equal(finish.status, 200, finishText);
  await delay(500);
  const settled = await admin.query("SELECT profile_data FROM public.player_profiles WHERE user_id = ANY($1::uuid[])", [[aId, bId]]);
  assert.equal(settled.rows.length, 2);
  assert.equal(Number((await admin.query("SELECT count(*) FROM public.match_settlements")).rows[0].count), 1);

  // Deterministic scrap-vs-commit race: the matchmaking request blocks on the
  // same profile row lock, then observes the ownership change before exposing
  // a room. This is the linearization fence required by F06.
  const third = await post("/api/auth/register", { email:`matchmaking-c-${process.pid}@example.test`, password:"valid-password-3" });
  assert.equal(third.status, 201);
  const thirdBody = await third.json();
  const cookieC = String(third.headers.get("set-cookie")).split(";")[0];
  const cId = thirdBody.account.id;
  await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(jsonb_set(profile_data, '{meta,collectionMode}', '\"OWNED_COPIES\"'::jsonb, true), '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [cId, JSON.stringify(ownershipFor(deckA))]);
  assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:"f06-c", name:"F06 C", cards:deckA.cards }] }, cookieC)).status, 200);
  await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(profile_data, '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [aId, JSON.stringify(ownershipFor(deckA))]);
  const raceQueue = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-a" }, cookieA);
  const raceQueueText = await raceQueue.text();
  assert.equal(raceQueue.status, 202, raceQueueText);
  const raceTicket = JSON.parse(raceQueueText).ticket;
  const lockClient = new Client({ connectionString:databaseUrl, application_name:"ocg-matchmaking-race-fence" });
  await lockClient.connect();
  await lockClient.query("BEGIN");
  await lockClient.query("SELECT user_id FROM public.player_profiles WHERE user_id = $1 FOR UPDATE", [aId]);
  const candidatePromise = post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"f06-c" }, cookieC);
  await delay(100);
  const staleOwnership = ownershipFor(deckA);
  staleOwnership[requiredCard] = Math.max(0, Number(staleOwnership[requiredCard]) - 1);
  await lockClient.query("UPDATE public.player_profiles SET profile_data = jsonb_set(profile_data, '{meta,ownedCards}', $2::jsonb, true) WHERE user_id = $1", [aId, JSON.stringify(staleOwnership)]);
  await lockClient.query("COMMIT");
  await lockClient.end();
  const candidateResponse = await candidatePromise;
  const candidateText = await candidateResponse.text();
  assert.equal(candidateResponse.status, 200, candidateText);
  assert.equal(JSON.parse(candidateText).ticket.status, "WAITING");
  const raceStale = await (await get(`/api/matchmaking/status?ticketId=${encodeURIComponent(raceTicket.ticketId)}`, cookieA)).json();
  assert.equal(raceStale.ticket.status, "INVALID");
  assert.equal(raceStale.ticket.invalidReason, "DECK_STALE");
  console.log("MATCHMAKING_COMMIT_HTTP_PG_REGRESSION OK · stale ownership rejected · no invalid room · valid ranked settlement");
  if (serverLogs.includes("PROFILE_MUTATION_FAILED") || serverLogs.includes("PROFILE_VALIDATION_UNAVAILABLE")) throw new Error(`unexpected matchmaking/profile failure log: ${serverLogs}`);
} finally {
  if (child) child.kill("SIGTERM");
  await delay(100);
  await admin.end().catch(() => {});
  rmSync(runtimeDir, { recursive:true, force:true });
}
