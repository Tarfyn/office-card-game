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
test("v7.14 adds objective Battle-phase attack context", () => {
    assert.match(app, /function battlePhaseContext\(match\)/);
    assert.match(app, /BATTLE DESK/);
    assert.match(app, /ATTACK READY/);
    assert.match(app, /LEGAL TARGETS/);
    assert.match(app, /DIRECT READY/);
    assert.match(app, /renderBattlePhaseContext\(match\)/);
});
test("v7.14 derives attack readiness only from server-projected legal attacks", () => {
    assert.match(app, /const attacks = match\.legalActions\?\.attacks \?\? \[\]/);
    assert.match(app, /const readyIds = new Set\(attacks\.map\(\(attack\) => attack\.attackerId\)\)/);
    assert.match(app, /legal targets come from the live server projection/);
    assert.doesNotMatch(app, /simulateBattleLegality|predictLegalAttack|interpretCombatRules/);
});
test("v7.14 exposes visible onboarding and attack-used context without overclaiming effect locks", () => {
    assert.match(app, /employees\.filter\(\(card\) => card\.onboarding\)\.length/);
    assert.match(app, /ATTACK USED/);
    assert.match(app, /NO LEGAL ATTACK/);
    assert.match(app, /server-projected legal attack list remains authoritative/);
});
test("v7.14 explains unavailable Employee attacks in the existing Inspector", () => {
    assert.match(app, /function employeeBattleAvailabilityNote\(card\)/);
    assert.match(app, /BATTLE PHASE/);
    assert.match(app, /Cannot attack this turn/);
    assert.match(app, /No attack remaining/);
    assert.match(app, /handCardAvailabilityNote\(card, cardDef\(card\.definitionId\)\) \?\? employeeBattleAvailabilityNote\(card\)/);
});
test("v7.14 Battle Desk remains compact on mobile", () => {
    assert.match(css, /\/\* v7\.14 battle-phase decision readability polish \*\//);
    assert.match(css, /\.battle-phase-context/);
    assert.match(css, /\.battle-phase-context-stats/);
    assert.match(css, /@media \(max-width:800px\)[\s\S]*\.battle-phase-context-stats \{ display:flex; overflow-x:auto/);
});
test("v7.14 remains a presentation-only release with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.14\.0"/);
    assert.match(html, /v7\.14 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.14 tests passed.`);
