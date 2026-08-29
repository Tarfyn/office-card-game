import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runBalanceMatchupSet } from "../src/balance.js";
let passed = 0;
function test(n, f) { try {
    f();
    passed++;
    console.log(`✓ ${n}`);
}
catch (e) {
    console.error(`✗ ${n}`);
    throw e;
} }
const cfg = { gamesPerMatchup: 4, baseSeed: 73101, maxTurns: 8, maxSteps: 500, matchups: [{ deckA: "customer-service-starter", deckB: "it-starter" }], sideSwap: true, alternateFirstPlayer: true };
test("v7.31 runs only requested matchup pairs", () => { const r = runBalanceMatchupSet(cfg); assert.equal(r.matchups.length, 1); assert.equal(r.decks.length, 2); assert.equal(r.games.length, 4); });
test("v7.31 swaps seats deterministically", () => { const r = runBalanceMatchupSet(cfg); assert.equal(r.games[0].p1Deck, "customer-service-starter"); assert.equal(r.games[1].p1Deck, "it-starter"); });
test("v7.31 varies opener independently from seat assignment", () => { const r = runBalanceMatchupSet(cfg); assert.deepEqual(r.games.map(g => g.firstPlayer), ["P1", "P1", "P2", "P2"]); assert.equal(r.games[0].p1Deck, "customer-service-starter"); assert.equal(r.games[2].p1Deck, "customer-service-starter"); });
test("v7.31 rejects unknown presets", () => { assert.throws(() => runBalanceMatchupSet({ ...cfg, matchups: [{ deckA: "missing", deckB: "it-starter" }] }), /Unknown deck preset/); });
test("v7.31 documents fixed matchup CLI", () => { const readme = readFileSync(fileURLToPath(new URL("../../README.md", import.meta.url)), "utf8"); assert.match(readme, /--matchups=deck-a:deck-b/); assert.match(readme, /Seats swap every other game/); });
test("v7.31 version markers are current", () => { const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8"); const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8"); assert.match(server, /version: "7\.31\.0"/); assert.match(html, /v7\.31 Alpha Playtest/i); });
console.log(`${passed}/6 v7.31 tests passed.`);
