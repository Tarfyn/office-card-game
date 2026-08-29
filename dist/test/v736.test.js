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
const r = runBalanceMatchupSet({ gamesPerMatchup: 4, baseSeed: 73601, maxTurns: 8, maxSteps: 500, matchups: [{ deckA: "customer-service-starter", deckB: "it-starter" }] });
test("v7.36 emits per-card balance stats", () => { assert.ok(r.cardStats.length > 0); assert.equal(typeof r.cardStats[0].gamesSeen, "number"); });
test("v7.36 tracks when-seen and when-played win rates separately", () => { const row = r.cardStats.find(x => x.gamesSeen > 0); if (!row)
    throw new Error("missing card stat"); assert.ok(row.winRateWhenSeen === null || typeof row.winRateWhenSeen === "number"); assert.ok(row.winRateWhenPlayed === null || typeof row.winRateWhenPlayed === "number"); });
test("v7.36 records copies played without mutating rules", () => { for (const row of r.cardStats) {
    assert.ok(row.totalCopiesPlayed >= row.gamesPlayed);
    assert.ok(row.averageCopiesPlayed >= 0);
} });
test("v7.36 card stats include identity metadata", () => { const row = r.cardStats[0]; if (!row)
    throw new Error("missing card stat"); assert.ok(row.definitionId); assert.ok(row.name); assert.ok(row.department); assert.ok(row.cardType); });
test("v7.36 docs warn correlation is not causation", () => { const readme = readFileSync(fileURLToPath(new URL("../../README.md", import.meta.url)), "utf8"); assert.match(readme, /correlational/i); assert.match(readme, /not automatically the cause/i); });
test("v7.36 version markers are current", () => { const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8"); const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8"); assert.match(server, /version: "7\.36\.0"/); assert.match(html, /v7\.36 Alpha Playtest/i); });
console.log(`${passed}/6 v7.36 tests passed.`);
