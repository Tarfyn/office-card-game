#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, copyFileSync, renameSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { PostgresAccountService } from "../server/account-service.mjs";
import { createPlayerMetaProfile, applyRewardGrant } from "../dist/src/economy.js";
import { createEmptyPlayerStats } from "../dist/src/match-history.js";
import { createRankedProfile } from "../dist/src/ranked.js";
import { buildStarterPackagePlan, normalizeStarterDepartment } from "../dist/src/starter-access.js";
import { alphaDefinitions } from "../dist/src/cards.js";
import { ALPHA_FORMAT } from "../dist/src/formats.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith("--")) continue;
  const [key, ...rest] = arg.slice(2).split("=");
  args.set(key, rest.join("=") || "true");
}
const has = (key) => args.has(key);
const value = (key, fallback = null) => args.has(key) ? args.get(key) : fallback;
const epochId = String(value("epoch", ""));
const cutoffAt = String(value("cutoff", ""));
const dryRun = !has("apply");
const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "");
const runtimeDir = resolve(String(value("runtime-dir", join(root, "runtime"))));
const defaultDepartment = String(value("default-department", "CUSTOMER_SERVICE"));

function fail(message, code = 2) { console.error(`ALPHA_RESET_FAIL ${message}`); process.exit(code); }
function hashFile(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function parseCutoff() {
  if (!/^alpha-[0-9]{8}T[0-9]{6}Z$/.test(epochId)) fail("invalid epoch; expected alpha-YYYYMMDDTHHMMSSZ");
  const parsed = new Date(cutoffAt);
  if (!Number.isFinite(parsed.getTime())) fail("invalid cutoff");
  return parsed;
}
function validateBackup(path) {
  if (!path || !existsSync(path) || !statSync(path).isFile()) fail("validated backup is missing");
  const approvedRoot = resolve("/srv/office-card-game/backups/postgresql");
  const resolvedBackup = resolve(path);
  if (process.env.OCG_ALPHA_RESET_TEST !== "1" && !resolvedBackup.startsWith(`${approvedRoot}/`)) fail("backup is outside the approved production backup directory");
  const maxAge = Math.max(60_000, Number(value("backup-max-age-ms", 6 * 60 * 60 * 1000)));
  if (Date.now() - statSync(path).mtimeMs > maxAge) fail("backup is older than the allowed activation window");
  const container = String(value("pg-restore-container", ""));
  const result = container
    ? spawnSync("docker", ["exec", container, "pg_restore", "--list", "/tmp/f04.dump"], { cwd:root, encoding:"utf8", shell:false })
    : spawnSync("pg_restore", ["--list", path], { cwd:root, encoding:"utf8", shell:false });
  if (result.error || result.status !== 0) fail("backup pg_restore --list failed");
  const digest = hashFile(path);
  const expected = String(value("backup-sha256", "")).trim().toLowerCase();
  if (expected && !/^[a-f0-9]{64}$/.test(expected)) fail("backup sha256 is invalid");
  if (expected && expected !== digest) fail("backup sha256 does not match");
  return { path, sha256:digest, bytes:statSync(path).size, modifiedAt:statSync(path).mtime.toISOString() };
}
function runtimeSummary() {
  const result = {};
  for (const [name, key] of [["rooms.local.json", "roomsToArchive"], ["matchmaking.local.json", "matchmakingEntriesToClear"]]) {
    const path = join(runtimeDir, name);
    if (!existsSync(path)) { result[key] = 0; continue; }
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      if (name === "rooms.local.json" && (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.rooms))) throw new Error("ROOM_SNAPSHOT_STRUCTURE_INVALID");
      if (name === "matchmaking.local.json" && (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.tickets))) throw new Error("MATCHMAKING_SNAPSHOT_STRUCTURE_INVALID");
      result[key] = name === "rooms.local.json" ? parsed.rooms.length : parsed.tickets.length;
    } catch { result[key] = "CORRUPT"; }
  }
  return result;
}
function validateSnapshotReference(path) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) fail("legacy/runtime snapshot reference is missing");
  const info = statSync(resolved);
  if (info.isDirectory()) {
    // Validate the referenced archive without changing the active runtime path.
    for (const [name, key] of [["rooms.local.json", "roomsToArchive"], ["matchmaking.local.json", "matchmakingEntriesToClear"]]) {
      const snapshot = join(resolved, name);
      if (!existsSync(snapshot) || !statSync(snapshot).isFile()) fail(`legacy/runtime snapshot is missing ${name}`);
      const parsed = JSON.parse(readFileSync(snapshot, "utf8"));
      if (name === "rooms.local.json" && (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.rooms))) fail(`legacy/runtime snapshot is invalid ${name}`);
      if (name === "matchmaking.local.json" && (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.tickets))) fail(`legacy/runtime snapshot is invalid ${name}`);
    }
    return { path:resolved, kind:"directory" };
  }
  if (!info.isFile()) fail("legacy/runtime snapshot reference is not a file or directory");
  try { JSON.parse(readFileSync(resolved, "utf8")); } catch { fail("legacy/runtime snapshot reference is invalid JSON"); }
  return { path:resolved, kind:"file", sha256:hashFile(resolved) };
}
function buildResetProfile({ userId, profile, now }) {
  const selected = normalizeStarterDepartment(profile?.meta?.starterOnboarding?.selectedDepartment) ?? normalizeStarterDepartment(defaultDepartment);
  if (!selected) throw new Error("ALPHA_RESET_DEPARTMENT_INVALID");
  const cards = Object.values(alphaDefinitions);
  const plan = buildStarterPackagePlan(selected.id, cards, ALPHA_FORMAT, `${epochId}:${userId}`, now);
  let meta = createPlayerMetaProfile([], 500, now);
  for (const grant of plan.grants) {
    const epochGrant = { ...grant, sourceRef:`alpha:${epochId}:${grant.sourceRef}` };
    meta = applyRewardGrant(meta, epochGrant, now).profile;
  }
  const deckId = `alpha-${epochId}-${userId}-first-day`.slice(0, 128);
  const deck = { id:deckId, name:"First Day Deck", cards:structuredClone(plan.firstDayDeck), source:"starter", sourceRef:`alpha:${epochId}:first-day-deck`, revision:1, createdAt:now, updatedAt:now };
  meta.starterOnboarding = { version:1, status:"COMPLETE", avatarChoiceVersion:1, selectedAvatarId:meta.cosmetics.loadout.avatarId, selectedDepartment:selected.id, completedAt:now, firstDayDeckId:deckId, boosterCount:8, boosterPresentationCount:0 };
  meta.firstSessionGuide = { version:1, eligible:true, hints:{}, goals:{}, events:[] };
  return { ...structuredClone(profile), meta, stats:createEmptyPlayerStats(1000), ranked:createRankedProfile(), matchHistory:[], decks:[deck], selectedDeckId:deckId, updatedAt:now };
}
function archiveRuntimeStores() {
  const archiveDir = join(runtimeDir, `alpha-reset-${epochId}`);
  mkdirSync(archiveDir, { recursive:true });
  for (const name of ["rooms.local.json", "matchmaking.local.json"]) {
    const source = join(runtimeDir, name);
    if (existsSync(source)) copyFileSync(source, join(archiveDir, name));
  }
  for (const [name, empty] of [["rooms.local.json", { version:1, rooms:[] }], ["matchmaking.local.json", { version:1, tickets:[] }]]) {
    const target = join(runtimeDir, name);
    const temp = `${target}.${epochId}.tmp`;
    writeFileSync(temp, `${JSON.stringify(empty, null, 2)}\n`, { encoding:"utf8", mode:0o600 });
    renameSync(temp, target);
  }
  return archiveDir;
}
function restoreRuntimeStores(archiveDir) {
  for (const name of ["rooms.local.json", "matchmaking.local.json"]) {
    const archived = join(archiveDir, name);
    if (existsSync(archived)) copyFileSync(archived, join(runtimeDir, name));
  }
}

parseCutoff();
if (!databaseUrl) fail("DATABASE_URL or OCG_TEST_DATABASE_URL is required");
const backupPath = String(value("backup", ""));
const legacySnapshot = String(value("legacy-snapshot", ""));
if (!dryRun) {
  if (String(value("confirm", "")) !== `ALPHA_RESET:${epochId}`) fail("exact confirmation token required");
  if (!backupPath || !legacySnapshot || !existsSync(legacySnapshot)) fail("backup and legacy snapshot references are required");
  validateBackup(backupPath);
  validateSnapshotReference(legacySnapshot);
}
const runtime = runtimeSummary();
if (Object.values(runtime).includes("CORRUPT")) fail("runtime snapshot is corrupt; refusing reset");
const migrationDir = join(root, "db", "migrations");
const service = await new PostgresAccountService({ databaseUrl, testDatabase:Boolean(process.env.OCG_TEST_DATABASE_URL), migrationDir, profileFactory:() => ({}) }).initialize();
let result;
let archiveDir = null;
try {
  if (!dryRun) {
    const existing = await service.getAlphaResetMetadata();
    if (existing?.completionState === "APPLIED" || existing?.state === "APPLIED") {
      if (String(existing.epochId ?? "") === epochId) {
        console.log(JSON.stringify({ status:"ALREADY_APPLIED", epochId }, null, 2));
        await service.close?.();
        process.exit(0);
      }
      fail("a different Alpha epoch is already applied");
    }
    archiveDir = archiveRuntimeStores();
  }
  result = await service.alphaReset({
    epochId, cutoffAt, dryRun,
    backupReference:dryRun ? null : `${backupPath}#${hashFile(backupPath)}`,
    legacySnapshotReference:dryRun ? null : legacySnapshot,
    resetProfile:({ userId, profile, now }) => buildResetProfile({ userId, profile, now })
  });
} catch (error) {
  if (archiveDir) restoreRuntimeStores(archiveDir);
  throw error;
} finally { await service.close?.(); }
console.log(JSON.stringify({ ...result, runtime, mode:dryRun ? "DRY_RUN" : "APPLY" }, null, 2));
if (!dryRun && result.status === "APPLIED") {
  console.log(JSON.stringify({ runtimeArchive:archiveDir, runtimeStatus:"REINITIALIZED" }));
}
