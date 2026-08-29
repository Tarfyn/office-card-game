import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8"));
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
test("v7.25 exposes a compact authoritative intent commit lifecycle", () => {
    assert.match(app, /intentCommit: null/);
    assert.match(app, /function setIntentCommit\(stage, intent, meta = \{\}\)/);
    assert.match(app, /function renderIntentCommitStatus\(match\)/);
    assert.match(app, /SENDING/);
    assert.match(app, /SERVER ACCEPTED/);
    assert.match(app, /NOT COMMITTED/);
    assert.match(app, /RESYNCING/);
});
test("v7.25 marks sending before the request and records accepted authoritative state", () => {
    assert.match(app, /setIntentCommit\('SENDING', intent, \{ intentId, fromVersion:match\.stateVersion \}\);\s*state\.intentBusy = true/s);
    assert.match(app, /setIntentCommit\('ACCEPTED', intent, \{ intentId, fromVersion:match\.stateVersion, toVersion:result\.view\?\.match\?\.stateVersion \}\)/);
    assert.match(app, /Authoritative match state is now v/);
});
test("v7.25 distinguishes explicit rejection from uncertain network delivery", () => {
    assert.match(app, /setIntentCommit\('REJECTED', intent/);
    assert.match(app, /interrupted \? 'RESYNCING' : 'REJECTED'/);
    assert.match(app, /Delivery was interrupted\. Refreshing the authoritative match state/);
    assert.match(app, /not confirmed yet/);
});
test("v7.25 keeps existing busy lock and accessible feedback instead of adding confirmation friction", () => {
    assert.match(app, /if \(state\.intentBusy\).*Move already submitting/s);
    assert.match(app, /aria-live="polite" aria-atomic="true"/);
    assert.match(app, /acceptedIntentFeedback\(intent\)/);
    assert.doesNotMatch(app, /confirm\(['\"]Commit this move/);
});
test("v7.25 commit strip is responsive and reduced-motion safe", () => {
    assert.match(css, /\.intent-commit-status/);
    assert.match(css, /\.tone-accepted/);
    assert.match(css, /\.tone-rejected/);
    assert.match(css, /\.tone-resyncing/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.intent-commit-status/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.commit-spinner/);
});
test("v7.25 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.25\.0"/);
    assert.match(html, /v7\.25 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.25 tests passed.`);
