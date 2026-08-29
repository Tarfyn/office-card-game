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
test("v7.24 guards only phase exits that leave visible opportunities behind", () => {
    assert.match(app, /function phaseAdvanceSafety\(match\)/);
    assert.match(app, /match\.phase === 'MAIN'.*availability\.playableCards \|\| availability\.abilities/s);
    assert.match(app, /match\.phase === 'BATTLE'.*availability\.attacks \|\| availability\.abilities/s);
    assert.match(app, /match\.phase === 'END'/);
    assert.match(app, /Capacity will expire/);
    assert.match(app, /There is no Main Phase 2/);
});
test("v7.24 uses a lightweight inline two-step confirmation instead of global modal friction", () => {
    assert.match(app, /function requestPhaseAdvance\(match\)/);
    assert.match(app, /pendingActionConfirmation = \{ kind:'ADVANCE_PHASE'/);
    assert.match(app, /action-confirmation-dock/);
    assert.match(app, /data-action="cancel-advance"/);
    assert.match(app, /data-action="confirm-advance"/);
    assert.match(app, /Stay here/);
    assert.match(app, /phase-risk-pill/);
});
test("v7.24 keeps clear phase advances immediate", () => {
    assert.match(app, /if \(!safety\) return sendIntent\(\{ type:'ADVANCE_PHASE' \}\)/);
    assert.doesNotMatch(app, /match\.phase === 'START'.*Leave/s);
    assert.doesNotMatch(app, /match\.phase === 'DRAW'.*Leave/s);
});
test("v7.24 invalidates stale confirmation state when play or authority moves on", () => {
    assert.match(app, /function acceptView\(view\) \{\s*state\.view = view;\s*state\.pendingActionConfirmation = null/);
    assert.match(app, /async function sendIntent\(intent\) \{\s*state\.pendingActionConfirmation = null/);
    assert.match(app, /function beginAttack\(attackerId\) \{\s*state\.pendingActionConfirmation = null/);
    assert.match(app, /function beginTargetIntent[\s\S]*state\.pendingActionConfirmation = null/);
});
test("v7.24 confirmation affordance is mobile and reduced-motion safe", () => {
    assert.match(css, /\.action-confirmation-dock/);
    assert.match(css, /\.phase-button\.guarded/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.confirmation-buttons/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.action-confirmation-dock/);
});
test("v7.24 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.24\.0"/);
    assert.match(html, /v7\.24 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.24 tests passed.`);
