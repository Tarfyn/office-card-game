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
test("v7.30 reconciles stale local interaction state when authority advances", () => { assert.match(app, /function reconcileAuthoritativeUi/); assert.match(app, /previousMatch\?\.stateVersion !== nextMatch\?\.stateVersion/); assert.match(app, /state\.selectedHand\.clear\(\)/); assert.match(app, /state\.interaction = null/); });
test("v7.30 clears transient match UI when a live session is parked or replaced", () => { assert.match(app, /function clearTransientMatchUi/); assert.match(app, /state\.focusedCardRef = null/); assert.match(app, /state\.intentCommit = null/); assert.match(app, /state\.lastLiveAt = null/); });
test("v7.30 hardens keyboard focus across generic interactive surfaces", () => { assert.match(css, /summary:focus-visible/); assert.match(css, /\[role="button"\]:focus-visible/); assert.match(css, /\[tabindex\]:focus-visible/); });
test("v7.30 adds intermediate-width and mobile-landscape hardening", () => { assert.match(css, /@media \(min-width:761px\) and \(max-width:1180px\)/); assert.match(css, /@media \(max-width:950px\) and \(orientation:landscape\)/); assert.match(css, /match-result-actions/); });
test("v7.30 extends reduced-motion coverage to recent Alpha UI", () => { assert.match(css, /v7\.30 — Alpha hardening/); assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /power-breakdown/); assert.match(css, /match-result-actions/); });
test("v7.30 version markers are current", () => { assert.match(server, /version: "7\.30\.0"/); assert.match(server, /Office Card Game v7\.30 server/); assert.match(html, /v7\.30 Alpha Playtest/i); });
console.log(`${passed}/6 v7.30 tests passed.`);
