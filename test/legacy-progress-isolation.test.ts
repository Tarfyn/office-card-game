import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAlphaMetaProfile, normalizePlayerMetaProfile } from "../src/economy.js";
import { prepareLegacyGuestImport } from "../src/guest-state.js";

const readRepoFile = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = readRepoFile("public/app.js");
const server = readRepoFile("server/server.mjs");
const accountService = readRepoFile("server/account-service.mjs");

const base = createAlphaMetaProfile();
const legacyMeta = {
  ...base,
  profileVersion: 2,
  balances: { ...base.balances, OFFICE_CREDITS: 140, SHREDDER_SCRAPS: 7 },
  progression: { ...base.progression, level: 3, xp: 220 }
};
const imported = prepareLegacyGuestImport(legacyMeta, 1234);
assert.ok(imported, "profileVersion 2 browser meta should be accepted for Guest compatibility");
assert.equal((imported as any).balances.OFFICE_CREDITS, 140);
assert.deepEqual((imported as any).legacyGuestState, {
  source: "BROWSER_META",
  version: 1,
  partial: true,
  importedAt: 1234
});

const normalized = normalizePlayerMetaProfile(imported as any, 1234);
assert.equal(normalized.progression.level, 3);
assert.equal(normalized.balances.OFFICE_CREDITS, 140);
assert.deepEqual(normalized.legacyGuestState, (imported as any).legacyGuestState);
assert.equal(normalizePlayerMetaProfile(base, 1234).legacyGuestState, null);
assert.equal(prepareLegacyGuestImport({ profileVersion: 1 }, 1234), undefined);

const guestRoute = server.slice(server.indexOf('path === "/api/profiles/guest"'), server.indexOf('path === "/api/profiles/me"'));
assert.match(guestRoute, /prepareLegacyGuestImport\(body\?\.importMeta\)/);
assert.match(guestRoute, /const initialMeta = imported/);
assert.match(server, /import \{ prepareLegacyGuestImport \} from "\.\.\/dist\/src\/guest-state\.js"/);

const saveMeta = app.slice(app.indexOf("function saveMetaProfile"), app.indexOf("function applyServerProfile"));
assert.match(saveMeta, /if \(state\.account\) return/);
const ensure = app.slice(app.indexOf("async function ensureServerProfile"), app.indexOf("function metaRequest"));
assert.match(ensure, /if \(current\.mode === 'ACCOUNT'/);
assert.ok(ensure.indexOf("if (current.mode === 'ACCOUNT'") < ensure.indexOf("const savedToken = localStorage.getItem"), "Account state wins before Guest token/localStorage fallback");
assert.match(ensure, /importMeta:state\.metaProfile/);
assert.match(app, /if \(!state\.account && localDecks\.length && !marker\)/, "legacy deck import is Guest-only");
const logout = app.slice(app.indexOf("async function logoutAccount"), app.indexOf("function bindAccountControls"));
assert.match(logout, /state\.account = null/);
assert.match(logout, /loadMetaProfile\(\)/);
assert.match(logout, /await ensureServerProfile\(\)/);
assert.doesNotMatch(accountService, /importMeta/, "PostgreSQL Account service has no legacy browser-import input");

console.log("LEGACY_PROGRESS_ISOLATION_OK · Guest browser-meta imports are marked partial; Account state stays PostgreSQL-authoritative");
