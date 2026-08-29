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
test("v7.17 adds a compact battlefield Desk Scan for both players", () => {
    assert.match(app, /function battlefieldScanContext\(player, own, match\)/);
    assert.match(app, /function renderBattlefieldScan\(player, own, match\)/);
    assert.match(app, /DESK SCAN/);
    assert.match(app, /renderBattlefieldScan\(player, own, match\)/);
});
test("v7.17 derives own live action counts from server-projected legal actions", () => {
    assert.match(app, /match\.legalActions\?\.attacks/);
    assert.match(app, /match\.legalActions\?\.activatableAbilities/);
    assert.match(app, /ATTACK/);
    assert.match(app, /ABILITY/);
    assert.doesNotMatch(app, /parseRulesText/);
});
test("v7.17 keeps opponent scan limited to visible field state", () => {
    assert.match(app, /setIncidents = supports\.filter\(\(card\) => !card\.faceUp\)\.length/);
    assert.match(app, /liveSystems = supports\.filter/);
    assert.match(app, /modifiedPower/);
    assert.match(app, /own \? new Set\(\(match\.legalActions\?\.attacks/);
});
test("v7.17 makes attack-ready badges more informative without changing legality", () => {
    assert.match(app, /function legalAttackOption\(instanceId\)/);
    assert.match(app, /function attackReadyBadgeMeta\(instanceId\)/);
    assert.match(app, /DIRECT READY/);
    assert.match(app, /ATTACK READY · \$\{fieldTargets\}/);
    assert.match(app, /legal Employee target/);
});
test("v7.17 keeps battlefield scanning compact on mobile", () => {
    assert.match(css, /\/\* v7\.17 battlefield live-state scan polish \*\//);
    assert.match(css, /\.battlefield-scan/);
    assert.match(css, /@media \(max-width:800px\)[\s\S]*\.battlefield-scan-items \{[\s\S]*flex-wrap:nowrap; overflow-x:auto/);
});
test("v7.17 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.17\.0"/);
    assert.match(html, /v7\.17 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.17 tests passed.`);
