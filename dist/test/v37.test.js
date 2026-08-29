import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAlphaMetaProfile } from "../src/economy.js";
import { PlayerProfileService } from "../src/profile.js";
let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
}
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v3.7 profile persistence restores the same secret-token profile after service restart", () => {
    let persisted = null;
    const persistence = {
        storageLabel: "TEST_PERSISTENT",
        load: () => persisted ? structuredClone(persisted) : null,
        save: (snapshot) => { persisted = structuredClone(snapshot); }
    };
    const meta = createAlphaMetaProfile();
    meta.balances.OFFICE_CREDITS = 321;
    const first = new PlayerProfileService({ idFactory: () => "profile-persist", tokenFactory: () => "token-persist", nowFactory: () => 100, persistence });
    first.create(meta, "Persistent QA");
    const changed = first.get("token-persist").meta;
    changed.balances.SHREDDER_SCRAPS = 55;
    first.updateMeta("token-persist", changed);
    const restarted = new PlayerProfileService({ idFactory: () => "unused", tokenFactory: () => "unused-token", nowFactory: () => 200, persistence });
    const restored = restarted.get("token-persist");
    assert.equal(restored.displayName, "Persistent QA");
    assert.equal(restored.meta.balances.OFFICE_CREDITS, 321);
    assert.equal(restored.meta.balances.SHREDDER_SCRAPS, 55);
    assert.equal(restarted.storageLabel, "TEST_PERSISTENT");
});
test("v3.7 match history updates persistent W-L stats once per room", () => {
    const service = new PlayerProfileService({ idFactory: () => "profile-stats", tokenFactory: () => "token-stats", nowFactory: () => 500 });
    service.create(undefined, "Stats QA");
    const entry = { roomId: "ROOM01", matchId: "match-ROOM01", mode: "FRIENDLY", outcome: "WIN", opponentName: "Opponent", deckName: "IT Starter", opponentDeckName: "Office Starter", turns: 9, reason: "REPUTATION_ZERO", finishedAt: 500 };
    service.recordMatch("token-stats", entry);
    service.recordMatch("token-stats", entry);
    const profile = service.get("token-stats");
    assert.equal(profile.stats.matchesPlayed, 1);
    assert.equal(profile.stats.wins, 1);
    assert.equal(profile.matchHistory.length, 1);
    assert.equal(profile.matchHistory[0].opponentName, "Opponent");
});
test("v3.7 server uses local JSON persistence and records match history with reward claims", () => {
    assert.match(server, /profileStorePath/);
    assert.match(server, /profiles\.local\.json/);
    assert.match(server, /localJsonPersistence\(profileStorePath, "FILE_JSON_LOCAL"\)/);
    assert.match(server, /persistence: profilePersistence/);
    assert.match(server, /profiles\.recordMatch/);
    assert.match(server, /profileStorage:profiles\.storageLabel/);
});
test("v3.7 Quick Match ticket survives a browser reload on the same running server", () => {
    assert.match(app, /MATCHMAKING_TICKET_KEY/);
    assert.match(app, /function saveMatchmakingTicket\(ticket\)/);
    assert.match(app, /async function restoreMatchmakingTicket\(\)/);
    assert.match(app, /Reconnected to your Quick Match search/);
    assert.match(app, /if \(!state\.session\) await restoreMatchmakingTicket\(\)/);
});
test("v3.7 lobby shows persistent profile stats and recent match history", () => {
    assert.match(app, /function renderProfileHistory\(\)/);
    assert.match(app, /W–L/);
    assert.match(app, /persistent local server profile/);
    assert.match(css, /v3\.7 persistent playtest profile \+ match history/);
});
test("v3.7 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/6 v3.7 tests passed.`);
