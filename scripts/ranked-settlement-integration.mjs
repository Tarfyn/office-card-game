import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { PostgresAccountService } from "../server/account-service.mjs";
import { runMigrations } from "./db-migrate.mjs";
import { PlayerProfileService } from "../dist/src/profile.js";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
if (!databaseUrl) throw new Error("OCG_TEST_DATABASE_URL is required; no PostgreSQL integration test was run");
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeDir = mkdtempSync(join(tmpdir(), "ocg-settlement-runtime-"));
const deckData = JSON.parse(readFileSync(join(root, "data", "decks.json"), "utf8"));
const port = 8890 + (process.pid % 500);
const { Client } = pg;
const admin = new Client({ connectionString:databaseUrl, application_name:"ocg-ranked-settlement-regression" });
let child = null;
let serverLogs = "";

function profileFactory(id) {
  const now = Date.now();
  return { playerId:id, profileId:id, displayName:"Employee TEST", meta:{ profileVersion:2, balances:{ OFFICE_CREDITS:100, SHREDDER_SCRAPS:0 }, ownedCards:{}, ownedCardVariants:{}, ownedPacks:{}, collectionMode:"SANDBOX_ALL_AVAILABLE", claimedRewardRooms:[], rewardGrants:[], achievements:{}, progression:{ level:1, xp:0, matchesCompleted:0, boostersOpened:0, cardsScrapped:0, cardsCrafted:0 }, cosmetics:{ owned:[], loadout:{ boardSkinId:"COS-BOARD-001", avatarId:"COS-AVA-001", avatarFrameId:null, avatarDecorationId:null, cardBackId:"COS-BACK-001", badgeId:null, titleId:null } }, firstSessionGuide:null, starterOnboarding:{ version:1, status:"COMPLETE", selectedDepartment:null, completedAt:null, firstDayDeckId:null, boosterCount:0, boosterPresentationCount:0 } }, stats:{ matchesPlayed:0, wins:0, losses:0, draws:0, resignLosses:0, rankedMatches:0, friendlyMatches:0, totalTurnsPlayed:0, totalDurationMs:0, ranked:{ matches:0, wins:0, losses:0, draws:0 } }, ranked:{ status:"PLACEMENT", tierId:"BRONZE", division:"IV", rating:1000, peakRating:1000, matchesPlayed:0, placementsPlayed:0, placementsRequired:5, wins:0, losses:0, draws:0, resignLosses:0, recentResults:[], seasonId:"ALPHA_PRESEASON", phase:"PRESEASON" }, matchHistory:[], decks:[], selectedDeckId:null, createdAt:now, updatedAt:now };
}

function scopeFactory(profileMap, credentials) {
  const saved = new Map([...profileMap.entries()].map(([id, profile]) => [id, structuredClone(profile)]));
  const service = new PlayerProfileService({
    progressionConfig:{ enabled:true },
    rankedConfig:{ enabled:true, initialRating:1000, minimumRating:100, placementsRequired:5, placementK:40, ratedK:24, currentSeasonId:"ALPHA_PRESEASON", phase:"PRESEASON" },
    playerPersistence:{ storageLabel:"POSTGRES_TRANSACTION", load:() => ({ version:3, players:[...saved.values()].map((profile) => structuredClone(profile)) }), save:(snapshot) => { saved.clear(); for (const profile of snapshot.players) saved.set(profile.playerId, structuredClone(profile)); } },
    credentialPersistence:{ storageLabel:"POSTGRES_TRANSACTION", load:() => ({ version:1, credentials }), save:() => {} }
  });
  return { service, profiles:() => new Map([...saved.entries()].map(([id, profile]) => [id, structuredClone(profile)])) };
}

function entry(matchId, roomId, playerSeat, result = "WIN", mode = "RANKED") {
  return { roomId, matchId, mode, outcome:result, result, playerSeat, opponentName:"Opponent", deckName:"Deck", opponentDeckName:"Deck", selectedDeckId:null, primaryDepartment:"MIXED", opponentDepartment:"MIXED", turns:1, durationMs:10, playerFinalRep:20, opponentFinalRep:20, rewardEligible:mode === "FRIENDLY" || mode === "RANKED", completionReason:"RESIGN", reason:"RESIGN", completedAt:Date.now(), finishedAt:Date.now() };
}

async function waitReady(base) {
  for (let i = 0; i < 40; i += 1) {
    try { const response = await fetch(`${base}/api/ready`); if (response.ok && (await response.json()).ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`settlement regression server did not become ready${serverLogs ? `: ${serverLogs}` : ""}`);
}

try {
  await admin.connect();
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await runMigrations({ databaseUrl, testDatabase:true });
  const env = { ...process.env, NODE_ENV:"test", PROFILE_STORAGE_BACKEND:"POSTGRES", DATABASE_REQUIRED:"1", DATABASE_URL:databaseUrl, PORT:String(port), PUBLIC_BASE_URL:`http://127.0.0.1:${port}`, ADMIN_TOKEN:"settlement-regression-admin", REQUIRE_HTTPS:"0", TRUST_PROXY:"0", RUNTIME_DIR:runtimeDir, ROOM_STORE_PATH:join(runtimeDir,"rooms.json"), MATCHMAKING_STORE_PATH:join(runtimeDir,"matchmaking.json"), PLAYER_STORE_PATH:join(runtimeDir,"players.json"), GUEST_CREDENTIAL_STORE_PATH:join(runtimeDir,"credentials.json"), PROFILE_STORE_PATH:join(runtimeDir,"profiles.json"), PLAYTEST_FEEDBACK_STORE_PATH:join(runtimeDir,"feedback.json") };
  child = spawn(process.execPath, [join(root, "server", "server.mjs")], { cwd:root, env, stdio:["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => { serverLogs += String(chunk); });
  child.stderr.on("data", (chunk) => { serverLogs += String(chunk); });
  const base = `http://127.0.0.1:${port}`;
  await waitReady(base);
  const post = async (path, body, cookie = "") => fetch(`${base}${path}`, { method:"POST", headers:{ "content-type":"application/json", origin:base, ...(cookie ? { cookie } : {}) }, body:JSON.stringify(body) });
  const first = await post("/api/auth/register", { email:`settlement-a-${process.pid}@example.test`, password:"valid-password-1" });
  const second = await post("/api/auth/register", { email:`settlement-b-${process.pid}@example.test`, password:"valid-password-2" });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  const firstBody = await first.json(); const secondBody = await second.json();
  const cookieA = String(first.headers.get("set-cookie")).split(";")[0];
  const cookieB = String(second.headers.get("set-cookie")).split(";")[0];
  const aId = firstBody.account.id; const bId = secondBody.account.id;
  await admin.query("UPDATE public.player_profiles SET profile_data = jsonb_set(profile_data, '{meta,collectionMode}', '\"SANDBOX_ALL_AVAILABLE\"'::jsonb, true) WHERE user_id = ANY($1::uuid[])", [[aId, bId]]);
  assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:"settlement-a-deck", name:"Settlement A", cards:deckData[0].cards }] }, cookieA)).status, 200);
  assert.equal((await post("/api/profiles/me/decks/import", { decks:[{ id:"settlement-b-deck", name:"Settlement B", cards:deckData[1].cards }] }, cookieB)).status, 200);
  const queueA = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"settlement-a-deck" }, cookieA);
  const queueB = await post("/api/matchmaking/enqueue", { mode:"RANKED", deckId:"settlement-b-deck" }, cookieB);
  const queueAText = await queueA.text(); const queueBText = await queueB.text();
  assert.equal(queueA.status, 202, queueAText); assert.equal(queueB.status, 200, queueBText);
  const ticketA = JSON.parse(queueAText).ticket;
  const matchedA = await (await fetch(`${base}/api/matchmaking/status?ticketId=${encodeURIComponent(ticketA.ticketId)}`, { headers:{ cookie:cookieA } })).json();
  const session = matchedA.ticket.session;
  assert.ok(session?.roomId);
  const state = await (await fetch(`${base}/api/rooms/${session.roomId}/state?token=${encodeURIComponent(session.token)}&clientId=settlement-regression`, { headers:{ cookie:cookieA } })).json();
  const finish = await post(`/api/rooms/${session.roomId}/intent?token=${encodeURIComponent(session.token)}`, { intentId:"settlement-resign", expectedStateVersion:state.match.stateVersion, intent:{ type:"RESIGN" } }, cookieA);
  assert.equal(finish.status, 200);
  await delay(500);
  const profilesAfter = (await admin.query("SELECT user_id, profile_data FROM public.player_profiles WHERE user_id = ANY($1::uuid[]) ORDER BY user_id", [[aId, bId]])).rows;
  assert.equal(profilesAfter.length, 2);
  for (const row of profilesAfter) { assert.equal(Number(row.profile_data.stats.rankedMatches), 1); assert.equal(Number(row.profile_data.ranked.matchesPlayed), 1); assert.equal(row.profile_data.matchHistory.length, 1); }
  assert.equal(Number((await admin.query("SELECT count(*) FROM public.match_settlements")).rows[0].count), 1);
  const grantsBeforeReward = Number((await admin.query("SELECT count(*) FROM public.reward_grants WHERE user_id = $1", [aId])).rows[0].count);
  const rewardFirst = await post(`/api/rooms/${session.roomId}/reward?token=${encodeURIComponent(session.token)}`, {}, cookieA);
  const rewardSecond = await post(`/api/rooms/${session.roomId}/reward?token=${encodeURIComponent(session.token)}`, {}, cookieA);
  assert.equal(rewardFirst.status, 200); assert.equal(rewardSecond.status, 200);
  assert.equal(Number((await admin.query("SELECT count(*) FROM public.reward_grants WHERE user_id = $1", [aId])).rows[0].count), grantsBeforeReward);
  const beforeReplay = (await admin.query("SELECT profile_data FROM public.player_profiles WHERE user_id = ANY($1::uuid[]) ORDER BY user_id", [[aId, bId]])).rows.map((row) => JSON.stringify(row.profile_data));
  for (let i = 0; i < 4; i += 1) await fetch(`${base}/api/rooms/${session.roomId}/state?token=${encodeURIComponent(session.token)}&clientId=settlement-regression`, { headers:{ cookie:cookieA } });
  const afterReplay = (await admin.query("SELECT profile_data FROM public.player_profiles WHERE user_id = ANY($1::uuid[]) ORDER BY user_id", [[aId, bId]])).rows.map((row) => JSON.stringify(row.profile_data));
  assert.deepEqual(afterReplay, beforeReplay);

  const service = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir:join(root,"db","migrations"), profileFactory, profileScopeFactory:scopeFactory }).initialize();
  const matchEntries = (id, room) => [{ playerId:aId, entry:entry(id, room, "P1") }, { playerId:bId, entry:entry(id, room, "P2", "LOSS") }];
  const ranked = (room) => ({ roomId:room, p1PlayerId:aId, p2PlayerId:bId, winnerPlayerId:aId, reason:"RESIGN", settledAt:Date.now() });
  const oldId = "durable-old-settlement";
  await service.settleMatchCompletion({ settlementId:oldId, matchId:oldId, mode:"RANKED", entries:matchEntries(oldId, oldId), rankedResult:ranked(oldId) });
  for (let i = 1; i <= 101; i += 1) { const id = `durable-${i}`; await service.settleMatchCompletion({ settlementId:id, matchId:id, mode:"RANKED", entries:matchEntries(id, id), rankedResult:ranked(id) }); }
  const beforeOldReplay = (await service.session((await service.login(`settlement-a-${process.pid}@example.test`, "valid-password-1")).sessionToken)).profile;
  const oldReplay = await service.settleMatchCompletion({ settlementId:oldId, matchId:oldId, mode:"RANKED", entries:matchEntries(oldId, oldId), rankedResult:ranked(oldId) });
  assert.equal(oldReplay.replayed, true);
  const afterOldReplay = (await service.session((await service.login(`settlement-a-${process.pid}@example.test`, "valid-password-1")).sessionToken)).profile;
  assert.equal(afterOldReplay.stats.rankedMatches, beforeOldReplay.stats.rankedMatches);
  const concurrentId = "concurrent-settlement";
  const concurrent = await Promise.all(Array.from({ length:6 }, () => service.settleMatchCompletion({ settlementId:concurrentId, matchId:concurrentId, mode:"RANKED", entries:matchEntries(concurrentId, concurrentId), rankedResult:ranked(concurrentId) })));
  assert.equal(concurrent.filter((item) => !item.replayed).length, 1);
  assert.equal(Number((await admin.query("SELECT count(*) FROM public.match_settlements WHERE settlement_id = $1", [concurrentId])).rows[0].count), 1);
  const failureId = "failure-retry-settlement";
  let failOnce = true;
  const normalFactory = service.profileScopeFactory;
  service.profileScopeFactory = (...args) => { if (failOnce) { failOnce = false; throw new Error("FORCED_SETTLEMENT_SCOPE_FAILURE"); } return normalFactory(...args); };
  await assert.rejects(() => service.settleMatchCompletion({ settlementId:failureId, matchId:failureId, mode:"RANKED", entries:matchEntries(failureId, failureId), rankedResult:ranked(failureId) }));
  const retried = await service.settleMatchCompletion({ settlementId:failureId, matchId:failureId, mode:"RANKED", entries:matchEntries(failureId, failureId), rankedResult:ranked(failureId) });
  assert.equal(retried.replayed, false);
  const restartedService = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir:join(root,"db","migrations"), profileFactory, profileScopeFactory:scopeFactory }).initialize();
  assert.equal((await restartedService.settleMatchCompletion({ settlementId:failureId, matchId:failureId, mode:"RANKED", entries:matchEntries(failureId, failureId), rankedResult:ranked(failureId) })).replayed, true);
  assert.equal(Number((await admin.query("SELECT count(*) FROM public.match_settlements WHERE settlement_id = $1", [failureId])).rows[0].count), 1);
  const friendlyId = "ordinary-friendly-settlement";
  const friendlyEntries = [{ playerId:aId, entry:entry(friendlyId, friendlyId, "P1", "WIN", "FRIENDLY") }, { playerId:bId, entry:entry(friendlyId, friendlyId, "P2", "LOSS", "FRIENDLY") }];
  await service.settleMatchCompletion({ settlementId:friendlyId, matchId:friendlyId, mode:"FRIENDLY", entries:friendlyEntries });
  assert.equal((await service.settleMatchCompletion({ settlementId:friendlyId, matchId:friendlyId, mode:"FRIENDLY", entries:friendlyEntries })).replayed, true);
  const ordinaryProfiles = (await admin.query("SELECT profile_data FROM public.player_profiles WHERE user_id = ANY($1::uuid[])", [[aId, bId]])).rows;
  assert.ok(ordinaryProfiles.every((row) => Number(row.profile_data.stats.friendlyMatches) === 1));
  console.log("RANKED_SETTLEMENT_HTTP_PG_REGRESSION OK · two-account settlement · durable dedupe · concurrent dedupe");
  if (serverLogs.includes("DB_OPERATION_FAILED")) throw new Error(`unexpected settlement failure log: ${serverLogs}`);
} finally {
  if (child) child.kill("SIGTERM");
  await delay(100);
  await admin.end().catch(() => {});
  rmSync(runtimeDir, { recursive:true, force:true });
}
