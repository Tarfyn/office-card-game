import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v7.28 defaults Match Review to authoritative key moments", () => { assert.match(app, /scope:'MOMENTS'/); assert.match(app, /REPLAY_MOMENT_EVENTS/); assert.match(app, /BATTLE_RESOLVED/); assert.match(app, /CHAIN_ITEM_NEGATED/); assert.match(app, /DESTRUCTION_PREVENTED/); });
test("v7.28 explains battle and Reputation outcomes from recorded event data", () => { assert.match(app, /function replayEventDetail/); assert.match(app, /Current Power/); assert.match(app, /Reputation.*→/); assert.match(app, /Breakthrough/); });
test("v7.28 adds compact replay moment statistics", () => { assert.match(app, /function replayMomentStats/); assert.match(app, /BATTLES/); assert.match(app, /RESPONSES/); assert.match(app, /REP LOST/); assert.match(app, /LARGEST SWING/); });
test("v7.28 supports direct turn jumps while retaining Key and All event scopes", () => { assert.match(app, /JUMP TO MOMENT/); assert.match(app, /data-replay-turn-jump/); assert.match(app, /Key events/); assert.match(app, /All engine events/); });
test("v7.28 replay moments stay responsive", () => { assert.match(css, /\.replay-moment-summary/); assert.match(css, /\.replay-turn-jumps/); assert.match(css, /\.replay-event\.moment/); assert.match(css, /@media \(max-width:760px\)[\s\S]*\.replay-moment-summary/); });
test("v7.28 version markers are current", () => { assert.match(server, /version: "7\.28\.0"/); assert.match(html, /v7\.28 Alpha Playtest/i); });
console.log(`${passed}/6 v7.28 tests passed.`);
