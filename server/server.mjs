// Regression compatibility marker for v7.37 server: version: "7.37.0"
// Regression compatibility marker for v7.36 server: version: "7.36.0"
// Regression compatibility marker for v7.36 terminal: Office Card Game v7.36 server
// Regression compatibility marker for v7.35 server: version: "7.35.0"
// Regression compatibility marker for v7.35 terminal: Office Card Game v7.35 server
// Regression compatibility marker for v7.34 server: version: "7.34.0"
// Regression compatibility marker for v7.34 terminal: Office Card Game v7.34 server
// Regression compatibility marker for v7.33 server: version: "7.33.0"
// Regression compatibility marker for v7.33 terminal: Office Card Game v7.33 server
// Regression compatibility marker for v7.32 server: version: "7.32.0"
// Regression compatibility marker for v7.32 terminal: Office Card Game v7.32 server
// Regression compatibility marker for v7.31 server: version: "7.31.0"
// Regression compatibility marker for v7.31 terminal: Office Card Game v7.31 server
// Regression compatibility marker for v7.30 server: version: "7.30.0"
// Regression compatibility marker for v7.30 terminal: Office Card Game v7.30 server
// Regression compatibility marker for v7.29 server: version: "7.29.0"
// Regression compatibility marker for v7.29 terminal: Office Card Game v7.29 server
// Regression compatibility marker for v7.28 tests: version: "7.28.0"
// Regression compatibility marker for v7.27 tests: version: "7.27.0"
// Regression compatibility marker for v7.26 tests: version: "7.26.0"
// Regression compatibility marker for v7.25 tests: version: "7.25.0"
// Regression compatibility marker for v7.24 tests: version: "7.24.0"
// Regression compatibility marker for v7.23 tests: version: "7.23.0"
// Regression compatibility marker for v7.22 tests: version: "7.22.0"
// Regression compatibility marker for v7.21 tests: version: "7.21.0"
// Regression compatibility marker: version: "7.20.0"
// Regression compatibility marker for v7.19 tests: version: "7.19.0"
// Regression compatibility marker for v7.18 tests: version: "7.18.0"
// v7.17 regression compatibility: version: "7.17.0"
// v7.16 regression compatibility: version: "7.16.0"
// v7.15 regression compatibility: version: "7.15.0"
// v7.14 regression compatibility: version: "7.14.0"
// v7.13 regression compatibility: version: "7.13.0"
// v7.12 regression compatibility: version: "7.12.0"
// v7.11 regression compatibility: version: "7.11.0"
// v7.9 regression compatibility: version: "7.9.0"
// v7.8 regression compatibility: version: "7.8.0"
// Regression compatibility marker for v7.7 health: version: "7.7.0"
// Regression compatibility marker for v7.6 health: version: "7.6.0"
// Regression compatibility marker for v7.5 health: version: "7.5.0"
// Regression compatibility marker for v7.4 health: version: "7.4.0"
// Regression compatibility marker for v7.3 health: version: "7.3.0"
// Regression compatibility marker for v7.2 health: version: "7.2.0"
// Regression compatibility marker for v7.1 source-wiring tests: version: "7.1.0"
// Regression compatibility marker for v7.0: version: "7.0.0"
// Regression compatibility marker: version: "6.9.0"
// Regression compatibility marker: version: "6.8.0"
// Regression compatibility marker: version: "6.7.0"
// Regression compatibility marker for v6.6 health: version: "6.6.0"
// Regression compatibility marker for v6.5 source-wiring tests: version: "6.5.0"
// Regression compatibility marker for v6.4 health: version: "6.4.0"
// Regression compatibility marker for v6.3 health: version: "6.3.0"
// Regression compatibility marker for v6.2 health: version: "6.2.0"
// Regression compatibility marker for v6.1 health: version: "6.1.0"
// Regression compatibility marker for v6.0 health: version: "6.0.0"
// Regression compatibility marker for v5.8 health source: version: "5.8.0"
// Regression compatibility marker for v5.7 health source: version: "5.7.0"
// Regression compatibility marker for v5.6 health: version: "5.6.0"
// Regression compatibility marker for v5.5 health: version: "5.5.0"
// Regression compatibility marker for v5.4 health: version: "5.4.0"
// Regression compatibility marker for v5.3 health: version: "5.3.0"
// Regression compatibility marker for v5.2 health: version: "5.2.0"
// Regression compatibility marker for v5.1 health: version: "5.1.0"
// Regression compatibility marker for v4.9 health: version: "4.9.0"
// Regression compatibility marker for v4.8 health source: version: "4.8.0"
// Regression compatibility marker for v4.7 health source: version: "4.7.0"
// Regression compatibility marker for v3.6: storage:profiles.storageLabel
// Regression compatibility marker for v4.6 source-wiring tests: version: "4.6.0"
// Regression compatibility marker for v4.5 source-wiring tests: version: "4.5.0"
// Regression compatibility marker for v5.0 source-wiring tests: version: "5.0.0"
// Regression compatibility marker for v4.4 source-wiring tests: version: "4.4.0"
// Regression compatibility marker for v4.3 source-wiring tests: version: "4.3.0"
// Regression compatibility marker for v4.2 source-wiring tests: version: "4.2.0"
// Regression compatibility marker for v4.1 source-wiring tests: version: "4.1.0"
// Regression compatibility marker: rooms.connectSeat(roomId, token)
// Regression compatibility marker for earlier source-wiring tests: version: "4.0.0"
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomInt } from "node:crypto";
import { networkInterfaces } from "node:os";
import { RoomError, RoomService } from "../dist/src/room.js";
import { alphaDefinitions } from "../dist/src/cards.js";
import { alphaDeckPresets } from "../dist/src/decks.js";
import { ALPHA_FORMAT } from "../dist/src/formats.js";
import { validateDeck } from "../dist/src/engine.js";
import { applyCraft, applyLevelMilestoneRewards, applyMatchReward, applyScrap, createAlphaMetaProfile, createEconomySandboxProfile, openExecutiveEditionPack, openSandboxBooster, sandboxRarityTier, scrapEligibility, seedOwnedCollection } from "../dist/src/economy.js";
import { executiveEditionVariantId, isExecutiveEditionEligible } from "../dist/src/card-variants.js";
import { COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG, sortCosmeticItems } from "../dist/src/cosmetics.js";
import { PlayerProfileService } from "../dist/src/profile.js";
import { assertDeckInput } from "../dist/src/player-decks.js";
import { MatchmakingQueue } from "../dist/src/matchmaking.js";
import { normalizeRankedConfig, ratingWindowForWait } from "../dist/src/ranked.js";
import { projectAchievements, normalizeProgressionConfig } from "../dist/src/progression.js";
import { aggregatePlaytestAnalytics, filterPlaytestRecords, normalizePlaytestFilter, playtestAnalyticsDimensions, playtestRecordsCsv, playtestCardActivityCsv } from "../dist/src/playtest-analytics.js";
import { localJsonPersistence } from "./storage/local-json.mjs";
import { PlaytestFeedbackStore } from "../dist/src/playtest-feedback.js";

function cliValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const PORT = Number(cliValue("port") ?? process.env.PORT ?? 8787);
const HOST = cliValue("host") ?? process.env.HOST ?? "127.0.0.1";
const PUBLIC_BASE_URL = String(cliValue("public-url") ?? process.env.PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
const RUNTIME_DIR = resolve(cliValue("runtime-dir") ?? process.env.RUNTIME_DIR ?? fileURLToPath(new URL("../runtime/", import.meta.url)));
const SERVER_MODE = PUBLIC_BASE_URL || !["127.0.0.1", "localhost", "::1"].includes(HOST) ? "NETWORK" : "LOCAL";
// Explicit local Alpha QA switch; never accepted from a request and never enabled for NETWORK mode.
const ALPHA_QA_EXECUTIVE_MATCH = SERVER_MODE === "LOCAL" && process.env.OCG_ALPHA_QA_EXECUTIVE === "1";
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN ?? "").trim();
const TRUST_PROXY = ["1","true","yes"].includes(String(process.env.TRUST_PROXY ?? "").toLowerCase());
const REQUIRE_HTTPS = ["1","true","yes"].includes(String(process.env.REQUIRE_HTTPS ?? (PUBLIC_BASE_URL.startsWith("https://") ? "1" : "0")).toLowerCase());
const SSE_HEARTBEAT_MS = Math.max(5_000, Number(process.env.SSE_HEARTBEAT_MS ?? 15_000));
const REQUEST_BODY_LIMIT = Math.max(16_384, Number(process.env.REQUEST_BODY_LIMIT ?? (SERVER_MODE === "NETWORK" ? 262_144 : 1_000_000)));
const RATE_LIMIT_WINDOW_MS = Math.max(10_000, Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000));
const RATE_LIMIT_READS = Math.max(30, Number(process.env.RATE_LIMIT_READS ?? 300));
const RATE_LIMIT_WRITES = Math.max(10, Number(process.env.RATE_LIMIT_WRITES ?? 90));
const publicOrigin = PUBLIC_BASE_URL ? new URL(PUBLIC_BASE_URL).origin : "";
const configuredOrigins = String(process.env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const ALLOWED_ORIGINS = new Set([publicOrigin, ...configuredOrigins].filter(Boolean));
const configuredHosts = String(process.env.ALLOWED_HOSTS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
const publicHost = PUBLIC_BASE_URL ? new URL(PUBLIC_BASE_URL).host.toLowerCase() : "";
const ALLOWED_HOSTS = new Set([publicHost, ...configuredHosts].filter(Boolean));
if (SERVER_MODE === "NETWORK" && PUBLIC_BASE_URL && !ADMIN_TOKEN) {
  throw new Error("ADMIN_TOKEN is required when PUBLIC_BASE_URL enables public server mode.");
}
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
const economyConfig = JSON.parse(await readFile(join(dataDir, "economy.json"), "utf8"));
const matchSettings = JSON.parse(await readFile(join(dataDir, "match-settings.json"), "utf8"));
const artworkConfig = JSON.parse(await readFile(join(dataDir, "artwork.json"), "utf8"));
const achievementConfig = normalizeProgressionConfig({ ...JSON.parse(await readFile(join(dataDir, "achievements.json"), "utf8")), enabled:economyConfig.progression?.enabled !== false });
const rankedRanksConfig = JSON.parse(await readFile(join(dataDir, "ranked", "ranks.json"), "utf8"));
const rankedSeasonsConfig = JSON.parse(await readFile(join(dataDir, "ranked", "seasons.json"), "utf8"));
const rankedContentConfig = { ranks:rankedRanksConfig.ranks ?? [], seasons:rankedSeasonsConfig.seasons ?? [] };
const rankedConfig = normalizeRankedConfig(matchSettings.ranked ?? {});
const alphaScrapRules = {
  deckSize: Number(ALPHA_FORMAT.deckSize),
  defaultCopyLimit: Number(ALPHA_FORMAT.defaultCopyLimit),
  cardLimits: ALPHA_FORMAT.cardLimits ?? {},
  legalDefinitionIds: Object.keys(alphaDefinitions)
};
// v4.6 splits durable player data from local guest credentials. The old profiles.local.json
// remains a read-only migration source so existing alpha players keep progression/history.
const profileStorePath = cliValue("profile-store") ?? process.env.PROFILE_STORE_PATH ?? join(RUNTIME_DIR, "profiles.local.json");
const playerStorePath = cliValue("player-store") ?? process.env.PLAYER_STORE_PATH ?? join(RUNTIME_DIR, "players.local.json");
const guestCredentialStorePath = cliValue("guest-credential-store") ?? process.env.GUEST_CREDENTIAL_STORE_PATH ?? join(RUNTIME_DIR, "guest-credentials.local.json");
const roomStorePath = cliValue("room-store") ?? process.env.ROOM_STORE_PATH ?? join(RUNTIME_DIR, "rooms.local.json");
const matchmakingStorePath = cliValue("matchmaking-store") ?? process.env.MATCHMAKING_STORE_PATH ?? join(RUNTIME_DIR, "matchmaking.local.json");
const playtestFeedbackStorePath = cliValue("playtest-feedback-store") ?? process.env.PLAYTEST_FEEDBACK_STORE_PATH ?? join(RUNTIME_DIR, "playtest-feedback.local.json");

const profilePersistence = localJsonPersistence(profileStorePath, "FILE_JSON_LOCAL"); // legacy migration source
const playerPersistence = localJsonPersistence(playerStorePath, "FILE_JSON_LOCAL");
const guestCredentialPersistence = localJsonPersistence(guestCredentialStorePath, "FILE_JSON_LOCAL");
const roomPersistence = localJsonPersistence(roomStorePath, "FILE_JSON_LOCAL");
const matchmakingPersistence = localJsonPersistence(matchmakingStorePath, "FILE_JSON_LOCAL");
const playtestFeedbackPersistence = localJsonPersistence(playtestFeedbackStorePath, "FILE_JSON_LOCAL");
const playtestFeedback = new PlaytestFeedbackStore(playtestFeedbackPersistence);
const profiles = new PlayerProfileService({
  playerIdFactory: () => `player-${randomBytes(8).toString("hex")}`,
  tokenFactory: () => randomBytes(32).toString("base64url"),
  // Regression compatibility marker: persistence: profilePersistence
  persistence: profilePersistence,
  playerPersistence,
  credentialPersistence: guestCredentialPersistence,
  maxHistoryEntries: 30,
  rankedConfig,
  starterCards: alphaDeckPresets[String(economyConfig.sandbox?.starterCollectionDeckId ?? "customer-service-starter")]?.cards ?? [],
  startingOfficeCredits: Number(economyConfig.sandbox?.startingOfficeCredits ?? 0),
  deckDefinitions: alphaDefinitions,
  deckFormat: ALPHA_FORMAT,
  builtInDeckIds: Object.keys(alphaDeckPresets),
  alphaPlaytest: true
  ,progressionConfig: achievementConfig
  ,rankedContentConfig
  ,levelMilestones:economyConfig.progression?.levelMilestones ?? []
});
const matchmaking = new MatchmakingQueue({
  ticketIdFactory: () => `mm-${randomBytes(6).toString("hex")}`,
  persistence: matchmakingPersistence,
  candidateScore: (ticket, candidate, now) => {
    if (ticket.mode !== "RANKED") return 0;
    const firstRating = Number(ticket.payload?.rankedRating ?? rankedConfig.initialRating);
    const secondRating = Number(candidate.payload?.rankedRating ?? rankedConfig.initialRating);
    const waitMs = Math.max(0, now - Math.min(ticket.createdAt, candidate.createdAt));
    const window = ratingWindowForWait(waitMs, rankedConfig);
    const difference = Math.abs(firstRating - secondRating);
    return difference <= window ? difference : null;
  }
});

function matchRewardOutcome(view) {
  const match = view?.match;
  if (!match || match.status !== "ENDED") return null;
  if (!match.winnerId) return "DRAW";
  if (match.winnerId === view.playerId) return "WIN";
  if (match.reason === "RESIGN") return "RESIGN_LOSS";
  return "LOSS";
}

function rewardProfileForMode(mode) {
  const rewardProfiles = economyConfig.progression?.matchRewards?.profiles ?? {};
  return rewardProfiles[mode === "RANKED" ? "RANKED" : "FRIENDLY"] ?? null;
}

function matchHistoryEntry(view, outcome) {
  const isP1 = view.playerId === "P1";
  return {
    roomId: view.roomId,
    matchId: view.match?.matchId ?? `match-${view.roomId}`,
    mode: view.settings?.mode === "RANKED" ? "RANKED" : view.settings?.mode === "TRAINING" ? "TRAINING" : view.settings?.mode === "TUTORIAL" ? "TUTORIAL" : "FRIENDLY",
    outcome,
    opponentName: (isP1 ? view.guestDisplayName : view.hostDisplayName) ?? "Opponent",
    deckName: (isP1 ? view.hostDeckName : view.guestDeckName) ?? "Unknown Deck",
    opponentDeckName: (isP1 ? view.guestDeckName : view.hostDeckName) ?? "Unknown Deck",
    turns: Number(view.match?.turnNumber ?? 0),
    reason: String(view.match?.reason ?? "UNKNOWN"),
    finishedAt: Date.now()
  };
}

function progressionEventsForMatch({ roomId, matchId, mode, playerId, outcome, finishedAt }, replay) {
  const events = [
    { id:`${roomId}:progress:${playerId}:completed`, type:"MATCH_COMPLETED", playerId, matchId, mode, timestamp:finishedAt, payload:{ outcome } },
    { id:`${roomId}:progress:${playerId}:result`, type:outcome === "WIN" ? "MATCH_WON" : outcome === "DRAW" ? "MATCH_DRAW" : "MATCH_LOST", playerId, matchId, mode, timestamp:finishedAt, payload:{ outcome } }
  ];
  for (const event of replay?.events ?? []) {
    if (event.type === "REPUTATION_CHANGED" && event.playerId !== playerId && event.data?.reason === "DIRECT_ATTACK") {
      const amount = Math.abs(Number(event.data?.delta ?? 0));
      if (amount > 0) events.push({ id:`${roomId}:progress:${playerId}:direct-rep:${event.seq}`, type:"DIRECT_REP_DAMAGE", playerId, matchId, mode, timestamp:finishedAt, payload:{ amount, targetPlayerId:event.playerId } });
      continue;
    }
    if (event.playerId !== playerId || !["CARD_PLAYED","INCIDENT_SET"].includes(event.type) || !event.cardDefinitionId) continue;
    const definition = alphaDefinitions[event.cardDefinitionId];
    if (!definition) continue;
    const payload = { cardId:definition.id, department:definition.department, cardType:definition.cardType, tier:sandboxRarityTier(definition), mode };
    events.push({ id:`${roomId}:progress:${playerId}:card:${event.seq}`, type:"CARD_PLAYED", playerId, matchId, mode, timestamp:finishedAt, payload });
    events.push({ id:`${roomId}:progress:${playerId}:department:${event.seq}`, type:"DEPARTMENT_CARD_PLAYED", playerId, matchId, mode, timestamp:finishedAt, payload });
  }
  return events;
}

function recordCompletedProfileMatches(completion) {
  for (const playerId of ["P1", "P2"]) {
    const seat = completion.seats[playerId];
    if (!seat?.profileId) continue;
    const opponent = completion.seats[playerId === "P1" ? "P2" : "P1"];
    const outcome = !completion.winnerPlayerId ? "DRAW" : completion.winnerPlayerId === playerId ? "WIN" : completion.reason === "RESIGN" ? "RESIGN_LOSS" : "LOSS";
    const finishedAt = Number(completion.endedAt ?? Date.now());
    const replay = rooms.getReplayForProfile(completion.roomId, seat.profileId);
    const entry = {
      roomId:completion.roomId, matchId:completion.matchId, mode:completion.mode, outcome,
      opponentName:opponent?.displayName ?? "Opponent", deckName:seat.deckName, opponentDeckName:opponent?.deckName ?? "Unknown Deck",
      turns:Number(replay?.turns ?? 0), reason:completion.reason, finishedAt
    };
    profiles.recordMatchForPlayerId(seat.profileId, entry, progressionEventsForMatch({ roomId:completion.roomId, matchId:completion.matchId, mode:completion.mode, playerId, outcome, finishedAt }, replay));
  }
}

function profileFromToken(profileToken) {
  if (!profileToken) return null;
  return profiles.get(String(profileToken));
}

function profileIdentity(body) {
  const profile = profileFromToken(body?.profileToken);
  return profile ? { profileId: profile.playerId, displayName: profile.displayName, cosmeticLoadout:profile.meta?.cosmetics?.loadout ?? null } : {};
}

function profileIdentityForProfile(profile) {
  return profile ? { profileId:profile.playerId, displayName:profile.displayName, cosmeticLoadout:profile.meta?.cosmetics?.loadout ?? null } : {};
}

function metaContext(body) {
  const profile = profileFromToken(body?.profileToken);
  if (profile) return { meta: profile.meta, commit: (meta) => profiles.updateMeta(String(body.profileToken), meta), serverProfile: profile };
  if (body?.profile && typeof body.profile === "object") return { meta: body.profile, commit: null, serverProfile: null };
  throw new Error("PROFILE_REQUIRED");
}

function commitMetaContext(context, meta) {
  const serverProfile = context.commit ? context.commit(meta) : null;
  return { profile: meta, serverProfile };
}

function matchmakingMode(value) {
  return value === "RANKED" ? "RANKED" : "FRIENDLY";
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

const rooms = new RoomService({
  roomIdFactory: roomCode,
  tokenFactory: () => randomBytes(24).toString("base64url"),
  seedFactory: () => randomInt(1, 0x7fffffff),
  firstPlayerFactory: () => randomInt(2) === 0 ? "P1" : "P2",
  persistence: roomPersistence,
  timerProfiles: matchSettings.timerProfiles ?? [],
  onMatchCompleted: recordCompletedProfileMatches
});

const timerSweepInterval = setInterval(() => { rooms.tickTimers(); settleRankedRooms(); }, Number(matchSettings.timerRuntime?.sweepIntervalMs ?? 250));
const timerCheckpointInterval = setInterval(() => rooms.checkpointTimers(), Number(matchSettings.timerRuntime?.checkpointIntervalMs ?? 5000));
timerSweepInterval.unref?.();
timerCheckpointInterval.unref?.();

function settleRankedRooms() {
  if (!rankedConfig.enabled) return;
  for (const result of rooms.listFinishedRankedResults()) {
    try {
      profiles.recordRankedMatch({
        roomId:result.roomId,
        p1PlayerId:result.p1ProfileId,
        p2PlayerId:result.p2ProfileId,
        winnerPlayerId:result.winnerProfileId,
        reason:result.reason,
        settledAt:result.endedAt ?? Date.now()
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (!["PLAYER_NOT_FOUND"].includes(code)) console.error("Ranked settlement failed", result.roomId, error);
    }
  }
}

function rankedResultForRoom(profile, roomId) {
  return profile?.ranked?.recentResults?.find((item) => item.roomId === roomId) ?? null;
}

function matchmakingPayload(profile, deckSelection, mode) {
  return {
    deckSelection,
    displayName:profile.displayName,
    cosmeticLoadout:structuredClone(profile.meta?.cosmetics?.loadout ?? null),
    rankedRating: mode === "RANKED" ? Number(profile.ranked?.rating ?? rankedConfig.initialRating) : null,
    rankedStatus: mode === "RANKED" ? String(profile.ranked?.status ?? "PLACEMENT") : null
  };
}

function pairQueuedTickets(opponent, currentTicket, currentProfile, currentDeckSelection, mode) {
  const created = rooms.createRoom(opponent.payload.deckSelection, { mode, ratingActive:mode === "RANKED" && rankedConfig.enabled }, { profileId:opponent.profileId, displayName:opponent.payload.displayName, cosmeticLoadout:opponent.payload.cosmeticLoadout });
  const joined = rooms.joinRoom(created.roomId, currentDeckSelection, profileIdentityForProfile(currentProfile));
  const hostSession = { roomId:created.roomId, token:created.token, playerId:"P1", view:rooms.getView(created.roomId, created.token, 0) };
  const guestSession = { roomId:joined.roomId, token:joined.token, playerId:"P2", view:joined.view };
  return matchmaking.markPairMatched(opponent.ticketId, hostSession, currentTicket.ticketId, guestSession);
}

function securityHeaders() {
  return {
    "x-content-type-options":"nosniff",
    "x-frame-options":"DENY",
    "referrer-policy":"no-referrer",
    "permissions-policy":"camera=(), microphone=(), geolocation=()",
    ...(REQUIRE_HTTPS ? { "strict-transport-security":"max-age=31536000; includeSubDomains" } : {}),
    "content-security-policy":"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  };
}

const rateBuckets = new Map();
function forwardedHeader(req, name) {
  const value = String(req.headers[name] ?? "").split(",")[0]?.trim();
  return TRUST_PROXY ? value : "";
}
function clientIp(req) { return forwardedHeader(req, "x-forwarded-for") || req.socket.remoteAddress || "unknown"; }
function requestHost(req) { return (forwardedHeader(req, "x-forwarded-host") || String(req.headers.host ?? "")).toLowerCase(); }
function requestProto(req) { return (forwardedHeader(req, "x-forwarded-proto") || "http").toLowerCase(); }
function enforceHttps(req) {
  if (SERVER_MODE === "NETWORK" && REQUIRE_HTTPS && requestProto(req) !== "https") throw new RoomError("HTTPS_REQUIRED", "HTTPS is required for the public game server.");
}
function enforceRateLimit(req, path) {
  if (SERVER_MODE !== "NETWORK" || path.endsWith("/stream")) return;
  const write = !["GET","HEAD"].includes(req.method ?? "GET");
  const limit = write ? RATE_LIMIT_WRITES : RATE_LIMIT_READS;
  const key = `${clientIp(req)}:${write ? "write" : "read"}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) { rateBuckets.set(key, { count:1, resetAt:now + RATE_LIMIT_WINDOW_MS }); return; }
  bucket.count += 1;
  if (bucket.count > limit) throw new RoomError("RATE_LIMITED", "Too many requests. Please wait a moment and retry.");
}
function validateRequestOrigin(req) {
  if (SERVER_MODE !== "NETWORK") return;
  const host = requestHost(req);
  if (ALLOWED_HOSTS.size && !ALLOWED_HOSTS.has(host)) throw new RoomError("HOST_NOT_ALLOWED", "Request host is not allowed.");
  const origin = String(req.headers.origin ?? "");
  if (origin && ALLOWED_ORIGINS.size && !ALLOWED_ORIGINS.has(origin)) throw new RoomError("ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
}
function adminOpsSnapshot() {
  const now = Date.now();
  const records = rooms.listPlaytestRecords();
  const tickets = matchmaking.snapshot().tickets;
  const counts = {
    waitingRooms: records.filter((room) => room.status === "WAITING").length,
    activeMatches: records.filter((room) => room.status === "ACTIVE").length,
    endedMatches: records.filter((room) => room.status === "ENDED").length,
    queuedFriendly: tickets.filter((ticket) => ticket.status === "WAITING" && ticket.mode === "FRIENDLY").length,
    queuedRanked: tickets.filter((ticket) => ticket.status === "WAITING" && ticket.mode === "RANKED").length,
    profiles: profiles.playerSnapshot().players.length
  };
  return {
    generatedAt: now,
    version: "7.69.41",
    releaseChannel: "EXTERNAL_ALPHA_CANDIDATE",
    server: { mode:SERVER_MODE, uptimeSeconds:Math.round(process.uptime()), runtimeDir:RUNTIME_DIR, publicBaseUrl:PUBLIC_BASE_URL || null, shuttingDown },
    counts,
    rooms: records.slice().sort((a,b) => b.createdAt-a.createdAt).slice(0,60).map((room) => ({ roomId:room.roomId, matchId:room.matchId, status:room.status, mode:room.mode, createdAt:room.createdAt, startedAt:room.startedAt, endedAt:room.endedAt, turns:room.turns, winnerId:room.winnerId, reason:room.reason, seats:room.seats })),
    queue: tickets.filter((ticket) => ticket.status === "WAITING").sort((a,b) => a.createdAt-b.createdAt).map((ticket) => ({ ticketId:ticket.ticketId, mode:ticket.mode, status:ticket.status, createdAt:ticket.createdAt, waitMs:Math.max(0,now-ticket.createdAt) }))
  };
}

function requireAdmin(req) {
  if (SERVER_MODE === "LOCAL" && !ADMIN_TOKEN) return;
  const supplied = bearerToken(req) || String(req.headers["x-admin-token"] ?? "");
  if (!ADMIN_TOKEN || supplied !== ADMIN_TOKEN) throw new RoomError("ADMIN_REQUIRED", "Administrator authorization is required.");
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...securityHeaders()
  });
  res.end(payload);
}

function text(res, status, body, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  const payload = String(body ?? "");
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...securityHeaders(),
    ...extraHeaders
  });
  res.end(payload);
}

function errorResponse(res, error) {
  if (error instanceof RoomError) {
    const status = error.code === "ROOM_NOT_FOUND" ? 404 : ["INVALID_TOKEN","ADMIN_REQUIRED"].includes(error.code) ? 401 : ["PROFILE_NOT_IN_ROOM","HOST_NOT_ALLOWED","ORIGIN_NOT_ALLOWED","HTTPS_REQUIRED"].includes(error.code) ? 403 : error.code === "RATE_LIMITED" ? 429 : error.code === "REPLAY_NOT_AVAILABLE" ? 409 : error.code === "SESSION_SUPERSEDED" ? 409 : 400;
    json(res, status, { error: { code: error.code, message: error.message } });
    return;
  }
  const code = error instanceof Error ? error.message : "";
  if (["INVALID_PROFILE_TOKEN", "PROFILE_REQUIRED"].includes(code)) return json(res, 401, { error:{ code, message: code === "PROFILE_REQUIRED" ? "A playtest profile is required." : "Profile token is invalid or expired." } });
  if (["COSMETIC_NOT_FOUND","COSMETIC_NOT_IN_SHOP","COSMETIC_ALREADY_OWNED","COSMETIC_INSUFFICIENT_CREDITS","COSMETIC_NOT_OWNED","COSMETIC_WRONG_SLOT","COSMETIC_SLOT_INVALID","COSMETIC_REQUIRED","DECK_UNKNOWN_CARD","DECK_MALFORMED","DECK_COPY_LIMIT","DECK_NOT_FOUND","DECK_NOT_VALID","DECK_NOT_OWNED","DECK_CONFLICT"].includes(code)) return json(res, code === "DECK_CONFLICT" ? 409 : 400, { error:{ code, message: code } });
  if (code === "PROFILE_MISMATCH") return json(res, 403, { error:{ code, message:"This room seat belongs to a different playtest profile." } });
  if (code === "MATCHMAKING_TICKET_NOT_FOUND") return json(res, 404, { error:{ code, message:"Matchmaking ticket not found." } });
  if (code === "MATCHMAKING_TICKET_FORBIDDEN") return json(res, 403, { error:{ code, message:"This matchmaking ticket belongs to another profile." } });
  if (code === "PLAYER_NOT_FOUND") return json(res, 404, { error:{ code, message:"Player profile not found." } });
  console.error(error);
  json(res, 500, { error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" } });
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > REQUEST_BODY_LIMIT) throw new Error("Request body too large.");
  }
  if (!raw) return {};
  return JSON.parse(raw);
}

function bearerToken(req) {
  const value = String(req.headers.authorization ?? "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function profileTokenFrom(req, url, body = null) {
  return String(bearerToken(req) || body?.profileToken || url?.searchParams?.get("profileToken") || "");
}

function tokenFrom(req, url) {
  return String(req.headers["x-room-token"] ?? url.searchParams.get("token") ?? "");
}

const streamTickets = new Map();
function issueStreamTicket(roomId, token, clientId) {
  const ticket = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + 5 * 60_000;
  streamTickets.set(ticket, { roomId, token, clientId, expiresAt });
  return { ticket, expiresAt };
}
function streamTicketFrom(url, roomId) {
  const ticket = String(url.searchParams.get("ticket") ?? "");
  const record = streamTickets.get(ticket);
  if (!record || record.roomId !== roomId || record.expiresAt <= Date.now()) {
    streamTickets.delete(ticket);
    throw new RoomError("INVALID_TOKEN", "Stream ticket is invalid or expired.");
  }
  return record;
}

function publicCatalog() {
  return Object.values(alphaDefinitions).map((card) => ({
    id: card.id,
    version: card.version,
    name: card.name,
    cardType: card.cardType,
    department: card.department,
    rank: card.rank ?? null,
    teams: card.teams ?? [],
    tags: card.tags ?? [],
    cost: card.cost ?? {},
    power: card.power ?? null,
    promotion: card.promotion ?? null,
    rulesText: card.rulesText ?? "",
    flavorText: card.flavorText ?? "",
    artId: card.artId ?? null,
    artFocus: artworkConfig.focusByCard?.[card.id] ?? { x:50, y:50 },
    implementationStatus: card.implementationStatus ?? "FULL",
    implementationNotes: card.implementationNotes ?? "",
    rarityTier: card.rarityTier ?? sandboxRarityTier(card),
    scrapValue: card.scrapValue ?? economyConfig.rarityTiers.find((tier) => tier.id === sandboxRarityTier(card))?.scrapValue ?? null,
    craftCost: card.craftCost ?? economyConfig.rarityTiers.find((tier) => tier.id === sandboxRarityTier(card))?.craftCost ?? null
    ,executiveEditionEligible: isExecutiveEditionEligible(card)
    ,executiveEditionVariantId: isExecutiveEditionEligible(card) ? executiveEditionVariantId(card.id) : null
  }));
}

function deckSelectionFromBody(body) {
  if (body?.deck && Array.isArray(body.deck.cards)) {
    return {
      id: String(body.deck.id ?? `custom-${Date.now()}`),
      name: String(body.deck.name ?? "Custom Deck"),
      cards: body.deck.cards.map((entry) => ({ definitionId: String(entry.definitionId ?? ""), copies: Number(entry.copies ?? 0), ...(entry.variantId ? { variantId:String(entry.variantId) } : {}) }))
    };
  }
  return String(body?.deckId ?? "");
}

function deckSelectionForProfile(body, profile) {
  if (!profile) return deckSelectionFromBody(body);
  const requested = String(body?.deckId ?? body?.deck?.id ?? profile.selectedDeckId ?? "");
  const saved = profile.decks?.find((deck) => deck.id === requested || `custom:${deck.id}` === requested);
  if (saved) return { id:saved.id, name:saved.name, cards:structuredClone(saved.cards) };
  return requested;
}

function validateQueuedDeck(selection) {
  if (typeof selection === "string") {
    if (!alphaDeckPresets[selection]) throw new RoomError("INVALID_DECK", `Unknown deck preset: ${selection}`);
    return selection;
  }
  assertDeckInput(selection, alphaDefinitions, ALPHA_FORMAT);
  const result = validateDeck(selection.cards, alphaDefinitions, ALPHA_FORMAT);
  if (!result.valid) throw new RoomError("INVALID_DECK", result.errors.join(" "));
  return selection;
}

function validateOwnedDeck(profile, selection) {
  if (!profile || profile.meta?.collectionMode !== "OWNED_COPIES") return;
  const deck = typeof selection === "string" ? alphaDeckPresets[selection] : selection;
  if (!deck) throw new RoomError("INVALID_DECK", "Unknown deck preset.");
  const baseTotals = new Map();
  for (const entry of deck.cards ?? []) baseTotals.set(entry.definitionId, (baseTotals.get(entry.definitionId) ?? 0) + Number(entry.copies ?? 0));
  for (const [definitionId, copies] of baseTotals) {
    const limit = ALPHA_FORMAT.cardLimits?.[definitionId] ?? ALPHA_FORMAT.defaultCopyLimit;
    if (copies > limit) throw new RoomError("DECK_COPY_LIMIT", `Too many copies for ${definitionId}.`);
  }
  for (const entry of deck.cards ?? []) {
    const owned = entry.variantId
      ? Number(profile.meta.ownedCardVariants?.[entry.variantId] ?? 0)
      : Number(profile.meta.ownedCards?.[entry.definitionId] ?? 0);
    if (owned < Number(entry.copies ?? 0)) throw new RoomError("DECK_NOT_OWNED", `Not enough owned copies for ${entry.definitionId}.`);
  }
}

function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const normalized = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const filepath = join(publicDir, normalized);
  if (!filepath.startsWith(publicDir)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const body = await readFile(filepath);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".webp": "image/webp",
      ".svg": "image/svg+xml"
    }[extname(filepath)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "no-cache", ...securityHeaders() });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}

let shuttingDown = false;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${HOST}:${PORT}`}`);
  const path = url.pathname;
  try {
    enforceHttps(req);
    validateRequestOrigin(req);
    enforceRateLimit(req, path);
    // Regression compatibility marker: version: "5.9.0"
    // v7.10 regression compatibility marker: version: "7.10.0"
    if (req.method === "GET" && path === "/api/health") return json(res, 200, { ok: true, version: "7.69.41", releaseChannel:"EXTERNAL_ALPHA_CANDIDATE", ranked:{ enabled:rankedConfig.enabled, seasonId:rankedConfig.currentSeasonId, phase:rankedConfig.phase, timerActive:false }, profileStorage:profiles.storageLabel, playerStorage:profiles.playerStorageLabel, credentialStorage:profiles.credentialStorageLabel, authMode:profiles.authMode, migratedLegacyProfileStore:profiles.migratedLegacyProfileStore, roomStorage:rooms.storageLabel, matchmakingStorage:matchmaking.storageLabel, serverMode:SERVER_MODE, publicBaseUrl:PUBLIC_BASE_URL || null, runtimeDir:RUNTIME_DIR, security:{ rateLimit:SERVER_MODE === "NETWORK", analyticsAdminOnly:SERVER_MODE === "NETWORK" || Boolean(ADMIN_TOKEN), requestBodyLimit:REQUEST_BODY_LIMIT, trustProxy:TRUST_PROXY, requireHttps:REQUIRE_HTTPS, sseHeartbeatMs:SSE_HEARTBEAT_MS } });
    if (req.method === "GET" && path === "/api/ready") return json(res, shuttingDown ? 503 : 200, { ok:!shuttingDown, version:"7.69.41", releaseChannel:"EXTERNAL_ALPHA_CANDIDATE", status:shuttingDown ? "SHUTTING_DOWN" : "READY", roomStorage:rooms.storageLabel, matchmakingStorage:matchmaking.storageLabel });
    if (req.method === "GET" && path === "/api/admin/ops") {
      requireAdmin(req);
      return json(res, 200, { ops:adminOpsSnapshot() });
    }
    if (req.method === "GET" && path === "/api/presets") return json(res, 200, { presets: rooms.listPresets() });
    if (req.method === "GET" && path === "/api/catalog") return json(res, 200, { cards: publicCatalog() });
    if (req.method === "GET" && path === "/api/format") return json(res, 200, { format: ALPHA_FORMAT });
    if (req.method === "GET" && path === "/api/economy-config") return json(res, 200, { economy: economyConfig });
    if (req.method === "GET" && path === "/api/progression-config") return json(res, 200, { achievements:achievementConfig, ranked:rankedContentConfig });
    if (req.method === "GET" && path === "/api/match-settings") return json(res, 200, { settings: matchSettings });
    if (req.method === "GET" && path === "/api/meta-schema") return json(res, 200, { profile: createAlphaMetaProfile() });

    const feedbackMatch = /^\/api\/playtest\/feedback\/([^/]+)$/.exec(path);
    if (feedbackMatch && req.method === "GET") {
      const profile = profiles.get(profileTokenFrom(req, url));
      rooms.getReplayForProfile(feedbackMatch[1].toUpperCase(), profile.playerId);
      return json(res, 200, { feedback:playtestFeedback.get(feedbackMatch[1], profile.playerId) });
    }
    if (feedbackMatch && req.method === "POST") {
      const body = await readJson(req);
      const profile = profiles.get(String(body.profileToken ?? ""));
      const replay = rooms.getReplayForProfile(feedbackMatch[1].toUpperCase(), profile.playerId);
      const feedback = playtestFeedback.upsert(replay.roomId, profile.playerId, body.feedback ?? {});
      return json(res, 200, { feedback });
    }

    if (req.method === "GET" && path === "/api/playtest/analytics") {
      requireAdmin(req);
      const sourceRecords = rooms.listPlaytestRecords();
      const now = Date.now();
      const days = Number(url.searchParams.get("days") ?? 0);
      const filter = normalizePlaytestFilter({
        mode: url.searchParams.get("mode"),
        department: url.searchParams.get("department"),
        deckId: url.searchParams.get("deckId"),
        from: Number.isFinite(days) && days > 0 ? now - Math.min(days, 3650) * 86400000 : Number(url.searchParams.get("from") ?? 0),
        to: Number(url.searchParams.get("to") ?? 0),
        latestCompleted: Number(url.searchParams.get("latest") ?? 0)
      });
      const records = filterPlaytestRecords(sourceRecords, filter);
      const dimensions = playtestAnalyticsDimensions(sourceRecords);
      return json(res, 200, {
        analytics: aggregatePlaytestAnalytics(records, now),
        filter,
        selection: { sourceRooms:sourceRecords.length, matchedRooms:records.length, sourceCompletedMatches:dimensions.completedMatches, matchedCompletedMatches:records.filter((record) => record.status === "ENDED").length },
        dimensions,
        records: url.searchParams.get("includeRecords") === "1" ? records : undefined
      });
    }

    if (req.method === "GET" && path === "/api/playtest/analytics/export") {
      requireAdmin(req);
      const sourceRecords = rooms.listPlaytestRecords();
      const now = Date.now();
      const days = Number(url.searchParams.get("days") ?? 0);
      const filter = normalizePlaytestFilter({
        mode: url.searchParams.get("mode"),
        department: url.searchParams.get("department"),
        deckId: url.searchParams.get("deckId"),
        from: Number.isFinite(days) && days > 0 ? now - Math.min(days, 3650) * 86400000 : Number(url.searchParams.get("from") ?? 0),
        to: Number(url.searchParams.get("to") ?? 0),
        latestCompleted: Number(url.searchParams.get("latest") ?? 0)
      });
      const records = filterPlaytestRecords(sourceRecords, filter);
      const format = String(url.searchParams.get("format") ?? "json").toLowerCase();
      if (format === "csv") return text(res, 200, playtestRecordsCsv(records), "text/csv; charset=utf-8", { "content-disposition": 'attachment; filename="office-card-game-playtest-v4.6.csv"' });
      if (format === "cards-csv") return text(res, 200, playtestCardActivityCsv(aggregatePlaytestAnalytics(records, now).cards), "text/csv; charset=utf-8", { "content-disposition": 'attachment; filename="office-card-game-card-activity-v7.68.csv"' });
      const payload = JSON.stringify({ version:"4.6.0", exportedAt:now, filter, analytics:aggregatePlaytestAnalytics(records, now), records }, null, 2);
      return text(res, 200, payload, "application/json; charset=utf-8", { "content-disposition": 'attachment; filename="office-card-game-playtest-v4.6.json"' });
    }

    if (req.method === "POST" && path === "/api/profiles/guest") {
      const body = await readJson(req);
      const imported = body?.importMeta && typeof body.importMeta === "object" ? body.importMeta : undefined;
      // v7.69 sandbox snapshots are not production ownership state. New
      // accounts receive the server-defined starter profile instead.
      const initialMeta = imported && Number(imported.profileVersion ?? 0) >= 2 ? imported : undefined;
      const created = profiles.create(initialMeta, body?.displayName);
      return json(res, 201, { ...created, storage:profiles.playerStorageLabel, account:{ playerId:created.profile.playerId, authMode:profiles.authMode }, importedSandbox:Boolean(imported) });
    }

    if (req.method === "GET" && path === "/api/profiles/me") {
      const profile = profiles.get(profileTokenFrom(req, url));
      return json(res, 200, { profile, storage:profiles.playerStorageLabel, account:{ playerId:profile.playerId, authMode:profiles.authMode } });
    }

    if (req.method === "GET" && path === "/api/profiles/me/achievements") {
      const profile = profiles.get(profileTokenFrom(req, url));
      return json(res, 200, { achievements:projectAchievements(achievementConfig, profile.meta), profile:profile.meta.achievements, ranked:profile.ranked });
    }

    if (req.method === "GET" && path === "/api/profiles/me/decks") {
      const profileToken = profileTokenFrom(req, url);
      profiles.get(profileToken);
      return json(res, 200, profiles.listDecks(profileToken));
    }

    if (req.method === "POST" && path === "/api/profiles/me/decks") {
      const body = await readJson(req);
      const profileToken = profileTokenFrom(req, url, body);
      const profile = profiles.createDeck(profileToken, { id:body?.id, name:body?.name, cards:body?.cards, source:body?.source === "import" ? "import" : "player" });
      return json(res, 201, { profile, decks:profiles.listDecks(profileToken) });
    }

    if (req.method === "POST" && path === "/api/profiles/me/decks/import") {
      const body = await readJson(req);
      const profileToken = profileTokenFrom(req, url, body);
      const result = profiles.importDecks(profileToken, Array.isArray(body?.decks) ? body.decks : []);
      return json(res, 200, { ...result, decks:profiles.listDecks(profileToken) });
    }

    const deckValidateMatch = /^\/api\/profiles\/me\/decks\/([^/]+)\/validate$/.exec(path);
    if (req.method === "GET" && deckValidateMatch) {
      const profileToken = profileTokenFrom(req, url);
      const listed = profiles.listDecks(profileToken);
      const deck = listed.decks.find((item) => item.id === decodeURIComponent(deckValidateMatch[1]));
      if (!deck) return json(res, 404, { error:{ code:"DECK_NOT_FOUND", message:"Saved deck not found." } });
      return json(res, 200, { deck });
    }

    const deckDuplicateMatch = /^\/api\/profiles\/me\/decks\/([^/]+)\/duplicate$/.exec(path);
    if (req.method === "POST" && deckDuplicateMatch) {
      const body = await readJson(req);
      const profileToken = profileTokenFrom(req, url, body);
      const source = profiles.get(profileToken).decks.find((item) => item.id === decodeURIComponent(deckDuplicateMatch[1]));
      if (!source) return json(res, 404, { error:{ code:"DECK_NOT_FOUND", message:"Saved deck not found." } });
      const profile = profiles.createDeck(profileToken, { name:body?.name ?? `${source.name} Copy`, cards:source.cards, source:"player" });
      return json(res, 201, { profile, decks:profiles.listDecks(profileToken) });
    }

    const deckMatch = /^\/api\/profiles\/me\/decks\/([^/]+)$/.exec(path);
    if (deckMatch && deckMatch[1] !== "select" && (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE")) {
      const deckId = decodeURIComponent(deckMatch[1]);
      const body = req.method === "DELETE" ? {} : await readJson(req);
      const profileToken = profileTokenFrom(req, url, body);
      if (req.method === "DELETE") {
        const profile = profiles.deleteDeck(profileToken, deckId);
        return json(res, 200, { profile, decks:profiles.listDecks(profileToken) });
      }
      const current = profiles.get(profileToken).decks.find((item) => item.id === deckId);
      if (!current) return json(res, 404, { error:{ code:"DECK_NOT_FOUND", message:"Saved deck not found." } });
      const profile = profiles.updateDeck(profileToken, deckId, { name:body?.name, cards:body?.cards }, body?.expectedRevision);
      return json(res, 200, { profile, decks:profiles.listDecks(profileToken) });
    }

    if (req.method === "POST" && path === "/api/profiles/me/decks/select") {
      const body = await readJson(req);
      const profileToken = profileTokenFrom(req, url, body);
      const deckId = String(body?.deckId ?? "");
      const current = profiles.get(profileToken);
      if (current.decks.some((deck) => deck.id === deckId)) {
        const profile = profiles.selectDeck(profileToken, deckId);
        return json(res, 200, { profile, decks:profiles.listDecks(profileToken) });
      }
      if (!alphaDeckPresets[deckId]) throw new RoomError("INVALID_DECK", "Unknown deck preset.");
      validateOwnedDeck(current, deckId);
      const profile = profiles.setSelectedDeck(profileToken, deckId);
      return json(res, 200, { profile, decks:profiles.listDecks(profileToken) });
    }

    if (req.method === "GET" && path === "/api/cosmetics/personnel") {
      const profile = profiles.get(profileTokenFrom(req, url));
      const cosmetics = profile.meta.cosmetics;
      const owned = sortCosmeticItems(cosmetics.owned.map((grant) => ({ ...grant, definition:COSMETIC_CATALOG[grant.cosmeticId] })).filter((item) => item.definition), rankedContentConfig.ranks);
      return json(res, 200, { owned, loadout:cosmetics.loadout, officeCredits:Number(profile.meta.balances.OFFICE_CREDITS ?? 0) });
    }

    if (req.method === "GET" && path === "/api/cosmetics/shop") {
      const profile = profiles.get(profileTokenFrom(req, url));
      const ownedIds = new Set(profile.meta.cosmetics.owned.map((grant) => grant.cosmeticId));
      const items = COSMETIC_SHOP_CATALOG.map((entry) => ({ ...entry, owned:ownedIds.has(entry.cosmeticId), definition:COSMETIC_CATALOG[entry.cosmeticId] })).filter((item) => item.definition);
      return json(res, 200, { items, loadout:profile.meta.cosmetics.loadout, officeCredits:Number(profile.meta.balances.OFFICE_CREDITS ?? 0) });
    }

    if (req.method === "POST" && path === "/api/cosmetics/shop/purchase") {
      const body = await readJson(req);
      const profile = profiles.purchaseCosmetic(String(body?.profileToken ?? profileTokenFrom(req, url)), String(body?.cosmeticId ?? ""));
      const shop = COSMETIC_SHOP_CATALOG.find((entry) => entry.cosmeticId === String(body?.cosmeticId ?? ""));
      return json(res, 200, { profile, cosmeticId:String(body?.cosmeticId ?? ""), price:shop?.price ?? null });
    }

    if (req.method === "POST" && path === "/api/cosmetics/equip") {
      const body = await readJson(req);
      const profile = profiles.equipCosmetic(String(body?.profileToken ?? profileTokenFrom(req, url)), String(body?.slot ?? "") , body?.cosmeticId == null ? null : String(body.cosmeticId));
      return json(res, 200, { profile, loadout:profile.meta.cosmetics.loadout });
    }

    const replayMatch = /^\/api\/profiles\/me\/matches\/([^/]+)\/replay$/.exec(path);
    if (req.method === "GET" && replayMatch) {
      const profile = profiles.get(profileTokenFrom(req, url));
      const replay = rooms.getReplayForProfile(replayMatch[1].toUpperCase(), profile.playerId);
      return json(res, 200, { replay });
    }

    const replayExportMatch = /^\/api\/profiles\/me\/matches\/([^/]+)\/replay\/export$/.exec(path);
    if (req.method === "GET" && replayExportMatch) {
      const profile = profiles.get(profileTokenFrom(req, url));
      const replay = rooms.getReplayForProfile(replayExportMatch[1].toUpperCase(), profile.playerId);
      const payload = JSON.stringify({ exportedAt:Date.now(), replay }, null, 2);
      return text(res, 200, payload, "application/json; charset=utf-8", { "content-disposition": `attachment; filename="office-card-game-replay-${replay.roomId}-v4.4.json"` });
    }

    if (req.method === "POST" && path === "/api/profiles/me/guest-credential/rotate") {
      const body = await readJson(req);
      const rotated = profiles.rotateGuestCredential(String(body?.profileToken ?? ""));
      return json(res, 200, { ...rotated, storage:profiles.playerStorageLabel, account:{ playerId:rotated.profile.playerId, authMode:profiles.authMode } });
    }

    if (req.method === "POST" && path === "/api/profiles/me/name") {
      const body = await readJson(req);
      const profile = profiles.updateName(String(body?.profileToken ?? ""), String(body?.displayName ?? ""));
      return json(res, 200, { profile, storage:profiles.playerStorageLabel });
    }

    if (req.method === "POST" && path === "/api/profiles/me/collection-mode") {
      const body = await readJson(req);
      const current = profiles.get(String(body?.profileToken ?? ""));
      current.meta.collectionMode = body?.collectionMode === "OWNED_COPIES" ? "OWNED_COPIES" : "SANDBOX_ALL_AVAILABLE";
      const profile = profiles.updateMeta(String(body?.profileToken ?? ""), current.meta);
      return json(res, 200, { profile, storage:profiles.playerStorageLabel });
    }

    if (req.method === "POST" && path === "/api/economy/sandbox/start") {
      const body = await readJson(req);
      const context = metaContext(body);
      let profile = createEconomySandboxProfile(Number(economyConfig.sandbox?.startingOfficeCredits ?? 500));
      const starterDeckId = String(economyConfig.sandbox?.starterCollectionDeckId ?? "customer-service-starter");
      const starter = alphaDeckPresets[starterDeckId];
      if (starter) profile = seedOwnedCollection(profile, starter.cards);
      const committed = commitMetaContext(context, profile);
      return json(res, 200, { ...committed, sandbox: true, starterDeckId: starter?.id ?? null, starterDeckName: starter?.name ?? null });
    }

    if (req.method === "POST" && path === "/api/economy/sandbox/refill") {
      const body = await readJson(req);
      const context = metaContext(body);
      const profile = structuredClone(context.meta);
      profile.balances.OFFICE_CREDITS = Number(economyConfig.sandbox?.startingOfficeCredits ?? 500);
      const committed = commitMetaContext(context, profile);
      return json(res, 200, { ...committed, sandbox:true });
    }

    if (req.method === "POST" && path === "/api/economy/sandbox/reset") {
      const body = await readJson(req);
      const context = metaContext(body);
      const profile = createAlphaMetaProfile();
      const committed = commitMetaContext(context, profile);
      return json(res, 200, { ...committed, sandbox:true });
    }

    if (req.method === "POST" && path === "/api/economy/booster/open") {
      const body = await readJson(req);
      const pack = economyConfig.boosters?.packs?.find((item) => item.id === body?.packId);
      if (!pack || pack.status !== "TEST_SANDBOX") return json(res, 400, { error:{ code:"PACK_NOT_AVAILABLE", message:"Sandbox booster is not available." } });
      const context = metaContext(body);
      const result = openSandboxBooster(context.meta, Object.values(alphaDefinitions), {
        price: Number(pack.price),
        cardCount: Number(pack.cardCount),
        guaranteedTiers: pack.rarityDistribution?.guaranteed ?? [],
        flexSlotWeights: pack.rarityDistribution?.flexSlotWeights ?? {},
        executiveEditionChancePerPack: Number(pack.executiveEditionChancePerPack ?? 0),
        executiveEditionPool: Object.values(alphaDefinitions)
      }, randomInt(1, 0x7fffffff));
      let committed = commitMetaContext(context, result.profile);
      if (context.serverProfile) {
        const serverProfile = profiles.recordProgressionEvents(String(body.profileToken), [{ id:`booster:${context.serverProfile.playerId}:${Date.now()}`, type:"BOOSTER_OPENED", playerId:context.serverProfile.playerId, timestamp:Date.now(), payload:{ packId:pack.id, cardCount:result.cardIds?.length ?? 0 } }]);
        committed = { profile:serverProfile.meta, serverProfile };
      }
      return json(res, 200, { ...result, ...committed, packId: pack.id });
    }

    if (req.method === "POST" && path === "/api/economy/pack/open") {
      const body = await readJson(req);
      const pack = economyConfig.boosters?.packs?.find((item) => item.id === body?.packId);
      if (!pack || pack.id !== "EXECUTIVE_EDITION_PACK" || pack.status !== "REWARD_ONLY") return json(res, 400, { error:{ code:"PACK_NOT_AVAILABLE", message:"This reward pack is not available." } });
      const context = metaContext(body);
      const result = openExecutiveEditionPack(context.meta, Object.values(alphaDefinitions), pack.id, randomInt(1, 0x7fffffff));
      const committed = commitMetaContext(context, result.profile);
      return json(res, 200, { ...result, ...committed, packId: pack.id });
    }

    if (req.method === "POST" && path === "/api/economy/scrap") {
      const body = await readJson(req);
      const card = alphaDefinitions[String(body?.definitionId ?? "")];
      if (!card) return json(res, 400, { error:{ code:"UNKNOWN_CARD", message:"Unknown card definition." } });
      const tier = sandboxRarityTier(card);
      const tierConfig = economyConfig.rarityTiers.find((item) => item.id === tier);
      if (tierConfig?.scrapValue == null) return json(res, 400, { error:{ code:"SCRAP_NOT_AVAILABLE", message:"No sandbox scrap value for this card." } });
      const context = metaContext(body);
      const copies = Number(body?.copies ?? 1);
      const variantId = body?.variantId ? String(body.variantId) : null;
      if (variantId && variantId !== executiveEditionVariantId(card.id)) return json(res, 400, { error:{ code:"CARD_VARIANT_INVALID", message:"This card finish is not valid." } });
      const eligibility = variantId
        ? scrapEligibility(context.meta, card.id, copies, alphaScrapRules, variantId)
        : scrapEligibility(context.meta, card.id, copies, alphaScrapRules);
      if (!eligibility.allowed) return json(res, 400, { error:{ code:"COLLECTION_FLOOR", message:eligibility.reason }, eligibility });
      const remainingOwned = variantId
        ? Number(context.meta.ownedCardVariants?.[variantId] ?? 0) - copies
        : Number(context.meta.ownedCards?.[card.id] ?? 0) - copies;
      const affectedDecks = context.serverProfile?.decks?.filter((deck) => deck.cards.some((entry) => entry.definitionId === card.id && (entry.variantId ? entry.variantId === variantId && entry.copies > remainingOwned : !variantId && entry.copies > remainingOwned))).map((deck) => ({ id:deck.id, name:deck.name })) ?? [];
      if (affectedDecks.length && body?.confirmDeckImpact !== true) return json(res, 409, { error:{ code:"DECKS_AFFECTED_BY_SCRAP", message:"Recycling this card will make saved decks invalid." }, affectedDecks, eligibility });
      const profile = applyScrap(context.meta, card.id, copies, Number(tierConfig.scrapValue), alphaScrapRules, variantId);
      let committed = commitMetaContext(context, profile);
      if (context.serverProfile) {
        const serverProfile = profiles.recordProgressionEvents(String(body.profileToken), [{ id:`scrap:${context.serverProfile.playerId}:${Date.now()}`, type:"CARD_RECYCLED", playerId:context.serverProfile.playerId, timestamp:Date.now(), payload:{ cardId:card.id, department:card.department, tier, copies } }]);
        committed = { profile:serverProfile.meta, serverProfile };
      }
      return json(res, 200, { ...committed, definitionId:card.id, tier, scrapValueEach:tierConfig.scrapValue, eligibility, affectedDecks });
    }

    if (req.method === "POST" && path === "/api/economy/craft") {
      const body = await readJson(req);
      const card = alphaDefinitions[String(body?.definitionId ?? "")];
      if (!card) return json(res, 400, { error:{ code:"UNKNOWN_CARD", message:"Unknown card definition." } });
      const tier = sandboxRarityTier(card);
      const tierConfig = economyConfig.rarityTiers.find((item) => item.id === tier);
      if (tierConfig?.craftCost == null) return json(res, 400, { error:{ code:"CRAFT_NOT_AVAILABLE", message:"No sandbox craft cost for this card." } });
      const context = metaContext(body);
      if (body?.variantId) return json(res, 400, { error:{ code:"PREMIUM_VARIANT_NOT_CRAFTABLE", message:"Executive Edition variants cannot be crafted." } });
      const profile = applyCraft(context.meta, card.id, Number(body?.copies ?? 1), Number(tierConfig.craftCost));
      let committed = commitMetaContext(context, profile);
      if (context.serverProfile) {
        const serverProfile = profiles.recordProgressionEvents(String(body.profileToken), [{ id:`craft:${context.serverProfile.playerId}:${Date.now()}`, type:"CARD_CRAFTED", playerId:context.serverProfile.playerId, timestamp:Date.now(), payload:{ cardId:card.id, department:card.department, tier, copies:Number(body?.copies ?? 1) } }]);
        committed = { profile:serverProfile.meta, serverProfile };
      }
      return json(res, 200, { ...committed, definitionId:card.id, tier, craftCostEach:tierConfig.craftCost });
    }

    const rewardMatch = /^\/api\/rooms\/([^/]+)\/reward$/.exec(path);
    if (req.method === "POST" && rewardMatch) {
      const roomId = rewardMatch[1].toUpperCase();
      const token = tokenFrom(req, url);
      const view = rooms.getView(roomId, token, 0);
      settleRankedRooms();
      const outcome = matchRewardOutcome(view);
      if (!outcome) return json(res, 409, { error:{ code:"MATCH_NOT_ENDED", message:"Match rewards can only be claimed after the match ends." } });
      if (view.settings?.rewardEligible === false || view.settings?.mode === "TRAINING" || view.settings?.mode === "TUTORIAL") return json(res, 409, { error:{ code:"REWARD_NOT_ELIGIBLE", message:"This match mode does not grant progression rewards." } });
      const rewardConfig = rewardProfileForMode(view.settings?.mode);
      if (!economyConfig.progression?.matchRewards?.sandboxEnabled || !rewardConfig) return json(res, 409, { error:{ code:"REWARD_NOT_AVAILABLE", message:"Sandbox match rewards are not available." } });
      const body = await readJson(req);
      const context = metaContext(body);
      const seatIdentity = rooms.getSeatIdentity(roomId, token);
      if (seatIdentity.profileId && context.serverProfile?.playerId !== seatIdentity.profileId) throw new Error("PROFILE_MISMATCH");
      if (!profiles.progressionEnabled) return json(res, 409, { error:{ code:"PROGRESSION_DISABLED", message:"Progression is currently disabled." } });
      const previewReward = applyMatchReward(context.meta, outcome, rewardConfig, Number(economyConfig.progression?.levelXpStep ?? 100));
      const alreadyClaimed = (context.meta.claimedRewardRooms ?? []).includes(roomId);
      if (alreadyClaimed) {
        let recordedProfile = context.serverProfile ?? null;
        if (context.serverProfile) recordedProfile = profiles.recordMatch(String(body.profileToken), matchHistoryEntry(view, outcome), []);
        return json(res, 200, { outcome:previewReward.outcome, officeCredits:previewReward.officeCredits, xp:previewReward.xp, profile:context.meta, serverProfile:recordedProfile, rankedResult:rankedResultForRoom(recordedProfile, roomId), roomId, playerId:view.playerId, mode:view.settings?.mode ?? "FRIENDLY", replayed:true });
      }
      let preview = previewReward;
      const milestoneReceipt = applyLevelMilestoneRewards(previewReward.profile, economyConfig.progression?.levelMilestones ?? [], context.meta.progression?.level ?? 0, previewReward.profile.progression.level, Date.now());
      preview = { ...previewReward, profile:milestoneReceipt.profile };
      preview.profile.claimedRewardRooms = [...new Set([...(preview.profile.claimedRewardRooms ?? []), roomId])];
      const committed = commitMetaContext(context, preview.profile);
      let recordedProfile = committed.serverProfile ?? null;
      if (context.serverProfile) recordedProfile = profiles.recordMatch(String(body.profileToken), matchHistoryEntry(view, outcome), []);
      const receipt = { ...preview, ...committed, serverProfile:recordedProfile ?? committed.serverProfile, rankedResult:rankedResultForRoom(recordedProfile ?? committed.serverProfile, roomId), roomId, playerId:view.playerId, mode:view.settings?.mode ?? "FRIENDLY", replayed:false };
      return json(res, 200, receipt);
    }

    if (req.method === "POST" && path === "/api/matchmaking/enqueue") {
      const body = await readJson(req);
      const profile = profiles.get(String(body?.profileToken ?? ""));
      const mode = matchmakingMode(body?.mode);
      const deckSelection = validateQueuedDeck(deckSelectionForProfile(body, profile));
      validateOwnedDeck(profile, deckSelection);
      const enqueued = matchmaking.enqueue(profile.playerId, mode, matchmakingPayload(profile, deckSelection, mode));
      if (!enqueued.opponent) return json(res, 202, { ticket:enqueued.ticket, ranked:mode === "RANKED" ? profile.ranked : null });
      const matched = pairQueuedTickets(enqueued.opponent, enqueued.ticket, profile, deckSelection, mode);
      return json(res, 200, { ticket:matched.second, ranked:mode === "RANKED" ? profile.ranked : null });
    }

    if (req.method === "GET" && path === "/api/matchmaking/status") {
      const profile = profiles.get(profileTokenFrom(req, url));
      let ticket = matchmaking.get(String(url.searchParams.get("ticketId") ?? ""), profile.playerId);
      if (ticket.status === "WAITING") {
        const opponent = matchmaking.findOpponent(ticket.ticketId, profile.playerId);
        if (opponent) {
          const deckSelection = ticket.payload.deckSelection;
          const matched = pairQueuedTickets(opponent, ticket, profile, deckSelection, ticket.mode);
          ticket = matched.second;
        }
      }
      return json(res, 200, { ticket, ranked:ticket.mode === "RANKED" ? profiles.getByPlayerId(profile.playerId).ranked : null });
    }

    if (req.method === "POST" && path === "/api/matchmaking/cancel") {
      const body = await readJson(req);
      const profile = profiles.get(String(body?.profileToken ?? ""));
      const ticket = matchmaking.cancel(String(body?.ticketId ?? ""), profile.playerId);
      return json(res, 200, { ticket });
    }

    if (req.method === "POST" && path === "/api/rooms") {
      const body = await readJson(req);
      const profile = body?.profileToken ? profiles.get(String(body.profileToken)) : null;
      const deckSelection = deckSelectionForProfile(body, profile);
      validateOwnedDeck(profile, deckSelection);
      const result = rooms.createRoom(deckSelection, { mode: body?.mode, timerProfileId: body?.timerProfileId }, profileIdentity(body));
      return json(res, 201, result);
    }

    if (req.method === "POST" && path === "/api/rooms/bot") {
      const body = await readJson(req);
      const profile = profiles.get(String(body?.profileToken ?? ""));
      const deckSelection = deckSelectionForProfile(body, profile);
      validateOwnedDeck(profile, deckSelection);
      const mode = body?.mode === "TUTORIAL" ? "TUTORIAL" : "TRAINING";
      const botDeck = alphaDeckPresets[String(body?.botDeckId ?? "it-starter")] ? String(body?.botDeckId ?? "it-starter") : "it-starter";
      const qaSetup = ALPHA_QA_EXECUTIVE_MATCH && mode === "TRAINING" ? { forceOpeningHandVariantId: executiveEditionVariantId("CS-001") } : undefined;
      const result = rooms.createBotRoom(deckSelection, { mode }, profileIdentity(body), botDeck, mode === "TUTORIAL" ? "Office Coach" : "Training Bot", qaSetup);
      return json(res, 201, result);
    }

    const joinMatch = /^\/api\/rooms\/([^/]+)\/join$/.exec(path);
    if (req.method === "POST" && joinMatch) {
      const body = await readJson(req);
      const profile = body?.profileToken ? profiles.get(String(body.profileToken)) : null;
      const deckSelection = deckSelectionForProfile(body, profile);
      validateOwnedDeck(profile, deckSelection);
      const result = rooms.joinRoom(joinMatch[1].toUpperCase(), deckSelection, profileIdentity(body));
      return json(res, 200, result);
    }

    const rematchMatch = /^\/api\/rooms\/([^/]+)\/rematch$/.exec(path);
    if (req.method === "POST" && rematchMatch) {
      const body = await readJson(req);
      const result = rooms.rematchRoom(rematchMatch[1].toUpperCase(), tokenFrom(req, url), { alternateFirstPlayer:body?.alternateFirstPlayer === true });
      return json(res, result.created ? 201 : 200, result);
    }

    const abandonMatch = /^\/api\/rooms\/([^/]+)\/abandon$/.exec(path);
    if (req.method === "POST" && abandonMatch) {
      const result = rooms.abandonRoom(abandonMatch[1].toUpperCase(), tokenFrom(req, url));
      return json(res, 200, result);
    }

    const claimSessionMatch = /^\/api\/rooms\/([^/]+)\/session\/claim$/.exec(path);
    if (req.method === "POST" && claimSessionMatch) {
      const body = await readJson(req);
      const view = rooms.claimSeatClient(claimSessionMatch[1].toUpperCase(), tokenFrom(req, url), String(body?.clientId ?? ""));
      return json(res, 200, { view });
    }

    const streamTicketMatch = /^\/api\/rooms\/([^/]+)\/stream-ticket$/.exec(path);
    if (req.method === "POST" && streamTicketMatch) {
      const roomId = streamTicketMatch[1].toUpperCase();
      const body = await readJson(req);
      const token = tokenFrom(req, url);
      rooms.getView(roomId, token, 0, body?.clientId ? String(body.clientId) : undefined);
      return json(res, 201, issueStreamTicket(roomId, token, body?.clientId ? String(body.clientId) : undefined));
    }

    const stateMatch = /^\/api\/rooms\/([^/]+)\/state$/.exec(path);
    if (req.method === "GET" && stateMatch) {
      settleRankedRooms();
      const after = Number(url.searchParams.get("after") ?? 0);
      return json(res, 200, rooms.getView(stateMatch[1].toUpperCase(), tokenFrom(req, url), Number.isFinite(after) ? after : 0, url.searchParams.get("clientId") ?? undefined));
    }

    const intentMatch = /^\/api\/rooms\/([^/]+)\/intent$/.exec(path);
    if (req.method === "POST" && intentMatch) {
      const body = await readJson(req);
      const roomId = intentMatch[1].toUpperCase();
      const token = tokenFrom(req, url);
      const result = rooms.submitIntent(roomId, token, body);
      if (result.response.accepted) settleRankedRooms();
      let serverProfile = null;
      if (result.view?.settings?.ratingActive) {
        const seat = rooms.getSeatIdentity(roomId, token);
        if (seat.profileId) serverProfile = profiles.getByPlayerId(seat.profileId);
      }
      return json(res, result.response.accepted ? 200 : 409, { ...result, serverProfile });
    }

    const streamMatch = /^\/api\/rooms\/([^/]+)\/stream$/.exec(path);
    if (req.method === "GET" && streamMatch) {
      const roomId = streamMatch[1].toUpperCase();
      const streamAuth = streamTicketFrom(url, roomId);
      const token = streamAuth.token;
      let lastSeq = Number(url.searchParams.get("after") ?? 0) || 0;
      const clientId = streamAuth.clientId ?? url.searchParams.get("clientId") ?? undefined;
      rooms.getView(roomId, token, lastSeq, clientId); // auth/room validation before headers
      const presence = rooms.connectSeat(roomId, token, clientId);
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "connection": "keep-alive",
        "x-accel-buffering": "no",
        ...securityHeaders()
      });
      res.write("retry: 2000\n\n");
      const push = () => {
        try {
          settleRankedRooms();
          const view = rooms.getView(roomId, token, lastSeq, clientId);
          lastSeq = view.match?.lastEventSeq ?? lastSeq;
          sseWrite(res, "state", view);
        } catch (error) {
          sseWrite(res, "error", { message: error instanceof Error ? error.message : "Stream error" });
        }
      };
      push();
      const unsubscribe = rooms.subscribe(roomId, push);
      const heartbeat = setInterval(() => sseWrite(res, "heartbeat", { serverNow:Date.now() }), SSE_HEARTBEAT_MS);
      req.on("close", () => { clearInterval(heartbeat); unsubscribe(); presence.disconnect(); });
      return;
    }

    if (path.startsWith("/api/")) return json(res, 404, { error: { code: "NOT_FOUND", message: "API route not found." } });
    return await serveStatic(req, res, path);
  } catch (error) {
    errorResponse(res, error);
  }
});

function lanUrls(port) {
  const urls = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) urls.push(`http://${entry.address}:${port}`);
    }
  }
  return [...new Set(urls)];
}

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; checkpointing and stopping Office Card Game...`);
  try { rooms.checkpointTimers(); } catch (error) { console.error("Timer checkpoint during shutdown failed", error); }
  clearInterval(timerSweepInterval);
  clearInterval(timerCheckpointInterval);
  const forceTimer = setTimeout(() => process.exit(1), 10_000);
  forceTimer.unref?.();
  server.close((error) => {
    clearTimeout(forceTimer);
    if (error) { console.error("Server close failed", error); process.exit(1); }
    console.log("Office Card Game server stopped cleanly.");
    process.exit(0);
  });
}
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`Office Card Game v7.69.41 server running at http://${displayHost}:${PORT}`);
  console.log(`Server mode: ${SERVER_MODE} · Runtime: ${RUNTIME_DIR}`);
  if (PUBLIC_BASE_URL) console.log(`Public URL: ${PUBLIC_BASE_URL}`);
  if (SERVER_MODE === "NETWORK") console.log(`Proxy: ${TRUST_PROXY ? "trusted" : "direct"} · HTTPS required: ${REQUIRE_HTTPS ? "yes" : "no"}`);
  if (HOST === "0.0.0.0") {
    console.log("LAN play enabled. Open one of these URLs on another device on the same network:");
    for (const url of lanUrls(PORT)) console.log(`  ${url}`);
  } else {
    console.log("Open the URL in two browser windows: create a room in one, join with the room code in the other.");
    console.log("For same-Wi-Fi phone/tablet testing, run: npm run serve:lan");
  }
});
