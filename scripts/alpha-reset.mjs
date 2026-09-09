#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, lstatSync, copyFileSync, renameSync, writeFileSync, openSync, fsyncSync, closeSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, relative, parse, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PostgresAccountService } from "../server/account-service.mjs";
import { createPlayerMetaProfile, applyRewardGrant } from "../dist/src/economy.js";
import { createEmptyPlayerStats } from "../dist/src/match-history.js";
import { createRankedProfile } from "../dist/src/ranked.js";
import { buildStarterPackagePlan, normalizeStarterDepartment } from "../dist/src/starter-access.js";
import { alphaDefinitions } from "../dist/src/cards.js";
import { ALPHA_FORMAT } from "../dist/src/formats.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_MODE = process.env.OCG_ALPHA_RESET_TEST === "1";
const PRODUCTION_BASE_ROOT = "/srv/office-card-game";
const PRODUCTION_RUNTIME_ROOT = "/srv/office-card-game/runtime";
const PRODUCTION_BACKUP_ROOT = "/srv/office-card-game/backups/postgresql";
const PRODUCTION_STATE_ROOT = "/var/lib/office-card-game-db-helper";
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
const requestedRuntime = String(value("runtime-dir", ""));
const runtimeDir = TEST_MODE ? resolve(requestedRuntime || join(root, "runtime")) : resolve(PRODUCTION_RUNTIME_ROOT);
const stateRoot = TEST_MODE ? resolve(String(value("state-dir", join(dirname(runtimeDir), `.alpha-reset-state-${process.pid}`)))) : resolve(PRODUCTION_STATE_ROOT);
const statePath = join(stateRoot, "alpha-reset-state.json");
const defaultDepartment = String(value("default-department", "CUSTOMER_SERVICE"));
const PHASES = new Set(["PREPARED", "RUNTIME_ARCHIVED", "RUNTIME_REINITIALIZED", "DB_COMMITTED", "COMPLETED", "RECOVERY_REQUIRED"]);

class ResetFailure extends Error {}
function abort(message) { throw new ResetFailure(String(message)); }
function fail(message) { console.error(`ALPHA_RESET_FAIL ${String(message)}`); process.exitCode = 2; }
function hashFile(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function jsonFile(path) { try { return JSON.parse(readFileSync(path, "utf8")); } catch { abort(`invalid JSON: ${path}`); } }
function assertRegular(info, label) { if (!info.isFile() || info.isSymbolicLink()) abort(`${label} must be a regular non-symlink file`); }
function assertDirectory(info, label) { if (!info.isDirectory() || info.isSymbolicLink()) abort(`${label} must be a regular non-symlink directory`); }
function rejectSymlinkComponents(path) {
  const absolute = resolve(path);
  const parsed = parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(/[\\/]+/).filter(Boolean)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) abort(`symlink path component rejected: ${path}`);
  }
}
function secureExisting(path, { rootPath = null, type = "file", label = "path" } = {}) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) abort(`${label} is missing`);
  rejectSymlinkComponents(absolute);
  const info = lstatSync(absolute);
  if (type === "file") assertRegular(info, label); else assertDirectory(info, label);
  const canonical = resolve(realpathSync.native(absolute));
  if (rootPath) {
    const approved = secureExisting(rootPath, { type:"directory", label:`${label} root` });
    const rel = relative(approved, canonical);
    if (rel.startsWith("..") || isAbsolute(rel)) abort(`${label} is outside its approved root`);
  }
  return canonical;
}
function ensureStateRoot() {
  if (!existsSync(stateRoot)) mkdirSync(stateRoot, { recursive:true, mode:0o700 });
  secureExisting(stateRoot, { type:"directory", label:"reset state root" });
}
function writeState(state) {
  ensureStateRoot();
  const temp = `${statePath}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding:"utf8", mode:0o600 });
  const descriptor = openSync(temp, "r+");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
  renameSync(temp, statePath);
  secureExisting(statePath, { rootPath:stateRoot, type:"file", label:"reset state" });
}
function loadState() {
  if (!existsSync(statePath)) return null;
  secureExisting(statePath, { rootPath:stateRoot, type:"file", label:"reset state" });
  const state = jsonFile(statePath);
  if (!state || typeof state !== "object" || !PHASES.has(String(state.phase ?? ""))) abort("reset state is malformed");
  if (String(state.epochId ?? "") !== epochId) abort("a different epoch has an existing reset state");
  return state;
}
function maybeInject(phase) { if (TEST_MODE && String(value("fail-after", "")) === phase) abort(`injected failure after ${phase}`); }
function parseCutoff() {
  if (!/^alpha-[0-9]{8}T[0-9]{6}Z$/.test(epochId)) abort("invalid epoch; expected alpha-YYYYMMDDTHHMMSSZ");
  const parsed = new Date(cutoffAt);
  if (!Number.isFinite(parsed.getTime())) abort("invalid cutoff");
  return parsed;
}
function validateBackup(path) {
  const canonical = secureExisting(path, { rootPath:TEST_MODE ? null : PRODUCTION_BACKUP_ROOT, type:"file", label:"validated backup" });
  const info = statSync(canonical);
  const maxAge = Math.max(60_000, Number(value("backup-max-age-ms", 6 * 60 * 60 * 1000)));
  if (!Number.isFinite(maxAge) || Date.now() - info.mtimeMs > maxAge) abort("backup is older than the allowed activation window");
  const container = String(value("pg-restore-container", ""));
  const result = container ? spawnSync("docker", ["exec", container, "pg_restore", "--list", "/tmp/f04.dump"], { cwd:root, encoding:"utf8", shell:false }) : spawnSync("pg_restore", ["--list", canonical], { cwd:root, encoding:"utf8", shell:false });
  if (result.error || result.status !== 0) abort("backup pg_restore --list failed");
  const digest = hashFile(canonical);
  const expected = String(value("backup-sha256", "")).trim().toLowerCase();
  if (expected && !/^[a-f0-9]{64}$/.test(expected)) abort("backup sha256 is invalid");
  if (expected && expected !== digest) abort("backup sha256 does not match");
  return { path:canonical, sha256:digest, bytes:info.size, modifiedAt:info.mtime.toISOString() };
}
function validateRuntimeStore(path, name) {
  const canonical = secureExisting(path, { rootPath:runtimeDir, type:"file", label:name });
  const parsed = jsonFile(canonical);
  const key = name === "rooms.local.json" ? "rooms" : "tickets";
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.version !== 1 || !Array.isArray(parsed[key])) abort(`${name} has invalid snapshot structure`);
  return { path:canonical, value:parsed, count:parsed[key].length };
}
function runtimeSummary() {
  const result = {};
  for (const [name, key] of [["rooms.local.json", "roomsToArchive"], ["matchmaking.local.json", "matchmakingEntriesToClear"]]) {
    const path = join(runtimeDir, name);
    if (!existsSync(path)) { result[key] = 0; continue; }
    try { result[key] = validateRuntimeStore(path, name).count; } catch { result[key] = "CORRUPT"; }
  }
  return result;
}
function validateSnapshotFile(path, name) {
  const canonical = secureExisting(path, { type:"file", label:`legacy/runtime snapshot ${name}` });
  const parsed = jsonFile(canonical);
  const key = name === "rooms.local.json" ? "rooms" : "tickets";
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.version !== 1 || !Array.isArray(parsed[key])) abort(`legacy/runtime snapshot is invalid ${name}`);
  const info = statSync(canonical);
  return { artifactType:key, path:canonical, sha256:hashFile(canonical), bytes:info.size, timestamp:info.mtime.toISOString() };
}
function validateSnapshotReference(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) abort("legacy/runtime snapshot reference is missing");
  const canonical = secureExisting(absolute, { rootPath:TEST_MODE ? null : PRODUCTION_BASE_ROOT, type:lstatSync(absolute).isDirectory() ? "directory" : "file", label:"legacy/runtime snapshot" });
  const info = statSync(canonical);
  if (info.isDirectory()) return { path:canonical, kind:"directory", artifacts:[validateSnapshotFile(join(canonical, "rooms.local.json"), "rooms.local.json"), validateSnapshotFile(join(canonical, "matchmaking.local.json"), "matchmaking.local.json")] };
  jsonFile(canonical);
  return { path:canonical, kind:"file", sha256:hashFile(canonical), bytes:info.size };
}
function buildResetProfile({ userId, profile, now }) {
  const selected = normalizeStarterDepartment(profile?.meta?.starterOnboarding?.selectedDepartment) ?? normalizeStarterDepartment(defaultDepartment);
  if (!selected) abort("invalid starter department");
  const plan = buildStarterPackagePlan(selected.id, Object.values(alphaDefinitions), ALPHA_FORMAT, `${epochId}:${userId}`, now);
  let meta = createPlayerMetaProfile([], 500, now);
  for (const grant of plan.grants) meta = applyRewardGrant(meta, { ...grant, sourceRef:`alpha:${epochId}:${grant.sourceRef}` }, now).profile;
  const deckId = `alpha-${epochId}-${userId}-first-day`.slice(0, 128);
  const deck = { id:deckId, name:"First Day Deck", cards:structuredClone(plan.firstDayDeck), source:"starter", sourceRef:`alpha:${epochId}:first-day-deck`, revision:1, createdAt:now, updatedAt:now };
  meta.starterOnboarding = { version:1, status:"COMPLETE", avatarChoiceVersion:1, selectedAvatarId:meta.cosmetics.loadout.avatarId, selectedDepartment:selected.id, completedAt:now, firstDayDeckId:deckId, boosterCount:8, boosterPresentationCount:0 };
  meta.firstSessionGuide = { version:1, eligible:true, hints:{}, goals:{}, events:[] };
  return { ...structuredClone(profile), meta, stats:createEmptyPlayerStats(1000), ranked:createRankedProfile(), matchHistory:[], decks:[deck], selectedDeckId:deckId, updatedAt:now };
}
function archiveRuntimeStores() {
  const runtime = secureExisting(runtimeDir, { type:"directory", label:"runtime directory" });
  const sources = [validateRuntimeStore(join(runtime, "rooms.local.json"), "rooms.local.json"), validateRuntimeStore(join(runtime, "matchmaking.local.json"), "matchmaking.local.json")];
  const archiveDir = join(runtime, `alpha-reset-${epochId}-${Date.now()}`);
  if (existsSync(archiveDir)) abort("runtime archive already exists; refusing to overwrite it");
  mkdirSync(archiveDir, { recursive:true, mode:0o700 });
  rejectSymlinkComponents(archiveDir);
  const artifacts = [];
  for (const source of sources) {
    const name = source.path.endsWith("rooms.local.json") ? "rooms.local.json" : "matchmaking.local.json";
    const destination = join(archiveDir, name);
    const before = hashFile(source.path);
    copyFileSync(source.path, destination);
    secureExisting(destination, { rootPath:runtime, type:"file", label:"runtime archive artifact" });
    const after = hashFile(source.path);
    const archived = hashFile(destination);
    if (before !== after || before !== archived) abort(`runtime archive verification failed for ${name}`);
    const info = statSync(destination);
    artifacts.push({ artifactType:name === "rooms.local.json" ? "rooms" : "matchmaking", originalPath:source.path, archivePath:resolve(realpathSync.native(destination)), sha256:archived, bytes:info.size, archivedAt:new Date().toISOString() });
  }
  return { directory:resolve(realpathSync.native(archiveDir)), artifacts };
}
function writeFreshStore(runtime, valueToWrite, name) {
  const target = join(secureExisting(runtime, { type:"directory", label:"runtime directory" }), name);
  if (existsSync(target)) secureExisting(target, { rootPath:runtime, type:"file", label:name });
  const temp = `${target}.${epochId}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(valueToWrite, null, 2)}\n`, { encoding:"utf8", mode:0o600 });
  renameSync(temp, target);
  validateRuntimeStore(target, name);
}
function reinitializeRuntimeStores() { writeFreshStore(runtimeDir, { version:1, rooms:[] }, "rooms.local.json"); writeFreshStore(runtimeDir, { version:1, tickets:[] }, "matchmaking.local.json"); }
function verifyArchive(archive) {
  if (!archive?.directory || !Array.isArray(archive.artifacts) || archive.artifacts.length !== 2) abort("reset state archive evidence is incomplete");
  secureExisting(archive.directory, { rootPath:runtimeDir, type:"directory", label:"runtime archive" });
  for (const artifact of archive.artifacts) {
    const file = secureExisting(artifact.archivePath, { rootPath:archive.directory, type:"file", label:"runtime archive artifact" });
    if (hashFile(file) !== artifact.sha256 || statSync(file).size !== artifact.bytes) abort("runtime archive integrity check failed");
  }
}
function restoreRuntimeStores(archive) {
  verifyArchive(archive);
  for (const artifact of archive.artifacts) {
    const name = artifact.artifactType === "rooms" ? "rooms.local.json" : "matchmaking.local.json";
    const target = join(secureExisting(runtimeDir, { type:"directory", label:"runtime directory" }), name);
    if (existsSync(target)) secureExisting(target, { rootPath:runtimeDir, type:"file", label:name });
    const temp = `${target}.${epochId}.${process.pid}.recovery.tmp`;
    copyFileSync(artifact.archivePath, temp);
    secureExisting(temp, { rootPath:runtimeDir, type:"file", label:`recovery ${name}` });
    renameSync(temp, target);
    validateRuntimeStore(target, name);
    if (hashFile(target) !== artifact.sha256) abort(`runtime recovery verification failed for ${name}`);
  }
}
function phaseRank(phase) { return ["PREPARED", "RUNTIME_ARCHIVED", "RUNTIME_REINITIALIZED", "DB_COMMITTED", "COMPLETED"].indexOf(phase); }

async function main() {
  const cutoff = parseCutoff();
  if (!databaseUrl) abort("DATABASE_URL or OCG_TEST_DATABASE_URL is required");
  if (!dryRun && !TEST_MODE && requestedRuntime && resolve(requestedRuntime) !== resolve(PRODUCTION_RUNTIME_ROOT)) abort("production apply cannot override the fixed runtime directory");
  const backupPath = String(value("backup", ""));
  const legacySnapshot = String(value("legacy-snapshot", ""));
  let backup = null; let legacy = null;
  if (!dryRun) {
    if (String(value("confirm", "")) !== `ALPHA_RESET:${epochId}`) abort("exact confirmation token required");
    if (!backupPath || !legacySnapshot) abort("backup and legacy snapshot references are required");
    backup = validateBackup(backupPath); legacy = validateSnapshotReference(legacySnapshot);
  }
  const runtime = runtimeSummary();
  if (existsSync(runtimeDir)) secureExisting(runtimeDir, { type:"directory", label:"runtime directory" });
  if (Object.values(runtime).includes("CORRUPT")) abort("runtime snapshot is corrupt; refusing reset");
  if (!dryRun) { secureExisting(runtimeDir, { type:"directory", label:"runtime directory" }); validateRuntimeStore(join(runtimeDir, "rooms.local.json"), "rooms.local.json"); validateRuntimeStore(join(runtimeDir, "matchmaking.local.json"), "matchmaking.local.json"); }
  const state = loadState();
  if (state?.phase === "COMPLETED") { console.log(JSON.stringify({ status:"ALREADY_APPLIED", epochId, recoveryState:state }, null, 2)); return; }
  if (state && !has("resume")) abort(`RECOVERY_REQUIRED phase=${state.phase}; rerun with --resume after reviewing the durable state`);
  if (dryRun) { console.log(JSON.stringify({ status:"DRY_RUN", runtime, epochId, cutoffAt:cutoff.toISOString(), state:state?.phase ?? null }, null, 2)); return; }
  const service = await new PostgresAccountService({ databaseUrl, testDatabase:Boolean(process.env.OCG_TEST_DATABASE_URL), migrationDir:join(root, "db", "migrations"), profileFactory:() => ({}) }).initialize();
  let current = state; let dbCommitted = state?.phase === "DB_COMMITTED";
  try {
    if (dbCommitted) {
      const marker = await service.getAlphaResetMetadata();
      if (marker?.epochId !== epochId || marker?.completionState !== "APPLIED") abort("DB_COMMITTED state does not match the durable epoch marker");
      current = { ...current, phase:"COMPLETED", completedAt:new Date().toISOString() }; writeState(current); console.log(JSON.stringify({ status:"APPLIED", epochId, recoveryState:current }, null, 2)); return;
    }
    if (!current || current.phase === "RECOVERY_REQUIRED") { current = { version:1, epochId, cutoffAt:cutoff.toISOString(), phase:"PREPARED", preparedAt:new Date().toISOString(), backup, legacySnapshot:legacy, runtimeDir:resolve(realpathSync.native(runtimeDir)), policyVersion:"alpha-reset-v1" }; writeState(current); maybeInject("PREPARED"); }
    let archive = current.archive;
    if (phaseRank(current.phase) < phaseRank("RUNTIME_ARCHIVED")) { archive = archiveRuntimeStores(); current = { ...current, phase:"RUNTIME_ARCHIVED", archive, archivedAt:new Date().toISOString() }; writeState(current); maybeInject("RUNTIME_ARCHIVED"); } else verifyArchive(archive);
    if (phaseRank(current.phase) < phaseRank("RUNTIME_REINITIALIZED")) { reinitializeRuntimeStores(); current = { ...current, phase:"RUNTIME_REINITIALIZED", reinitializedAt:new Date().toISOString() }; writeState(current); maybeInject("RUNTIME_REINITIALIZED"); }
    const result = await service.alphaReset({ epochId, cutoffAt, dryRun:false, backupReference:`${backup.path}#${backup.sha256}`, legacySnapshotReference:legacy.path, runtimeArchive:archive, resetProfile:({ userId, profile, now }) => buildResetProfile({ userId, profile, now }) });
    dbCommitted = result.status === "APPLIED" || result.status === "ALREADY_APPLIED";
    current = { ...current, phase:"DB_COMMITTED", dbResult:result.status, dbCommittedAt:new Date().toISOString() }; writeState(current); maybeInject("DB_COMMITTED");
    current = { ...current, phase:"COMPLETED", completedAt:new Date().toISOString() }; writeState(current);
    console.log(JSON.stringify({ ...result, runtime, recoveryState:current, mode:"APPLY" }, null, 2));
  } catch (error) {
    if (!dbCommitted && current?.archive) { try { restoreRuntimeStores(current.archive); current = { ...current, phase:"RECOVERY_REQUIRED", recoveryAction:"RUNTIME_RESTORED_BEFORE_DB_COMMIT", recoveredAt:new Date().toISOString() }; writeState(current); } catch (recoveryError) { throw new ResetFailure(`recovery failed: ${recoveryError instanceof Error ? recoveryError.message : "unknown error"}`); } }
    throw error;
  } finally { await service.close?.(); }
}

try { await main(); } catch (error) { fail(error instanceof ResetFailure ? error.message : "reset failed"); }
