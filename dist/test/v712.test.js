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
test("v7.12 summarizes the visible opening hand without scoring it", () => {
    assert.match(app, /function openingHandSummary\(match\)/);
    assert.match(app, /EMPLOYEE:0, ACTION:0, INCIDENT:0, SYSTEM:0/);
    assert.match(app, /firstCapacityCards/);
    assert.match(app, /cost != null && cost <= 2/);
    assert.doesNotMatch(app, /OPENING SCORE|HAND SCORE|GOOD HAND|BAD HAND/);
});
test("v7.12 makes opener and first-draw consequences explicit", () => {
    assert.match(app, /YOU OPEN/);
    assert.match(app, /SECOND DESK/);
    assert.match(app, /FIRST DRAW SKIPPED/);
    assert.match(app, /FIRST DRAW AVAILABLE/);
    assert.match(app, /Capacity starts at 2/);
});
test("v7.12 keeps the opening snapshot scoped to setup and the first turn", () => {
    assert.match(app, /const opening = match\.status === 'SETUP'/);
    assert.match(app, /match\.status === 'ACTIVE' && match\.turnNumber === 1 && \['START','DRAW','MAIN'\]\.includes\(match\.phase\)/);
    assert.match(app, /if \(!opening && !firstTurn\) return ''/);
    assert.match(app, /renderOpeningReadiness\(match\)/);
});
test("v7.12 exposes objective opening-hand type and starting-capacity stats", () => {
    assert.match(app, /OPENING SNAPSHOT/);
    assert.match(app, /EMPLOYEES/);
    assert.match(app, /ACTIONS/);
    assert.match(app, /INCIDENTS/);
    assert.match(app, /SYSTEMS/);
    assert.match(app, /COST ≤2/);
    assert.match(app, /fit starting Capacity/);
});
test("v7.12 opening readability stays compact on mobile", () => {
    assert.match(css, /\/\* v7\.12 opening hand \+ first-turn readability polish \*\//);
    assert.match(css, /\.opening-readiness/);
    assert.match(css, /\.opening-readiness-stats/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.opening-readiness-stats \{ display:flex; overflow-x:auto/);
});
test("v7.12 remains a presentation-only release with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.12\.0"/);
    assert.match(html, /v7\.12 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.12 tests passed.`);
