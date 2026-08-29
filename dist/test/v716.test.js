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
test("v7.16 adds a server-projected Response Desk", () => {
    assert.match(app, /function responseDecisionContext\(match\)/);
    assert.match(app, /RESPONSE DESK/);
    assert.match(app, /PRIORITY/);
    assert.match(app, /RESPONSES/);
    assert.match(app, /renderResponseDecisionContext\(match\)/);
});
test("v7.16 explains visible response focus without interpreting card rules", () => {
    assert.match(app, /function responseFocusContext\(match\)/);
    assert.match(app, /ATTACK_DECLARED/);
    assert.match(app, /BATTLE_DESTRUCTION_PENDING/);
    assert.match(app, /ACTION_WOULD_BE_ARCHIVED/);
    assert.match(app, /responseWindowContext\(match\)/);
    assert.doesNotMatch(app, /parseRulesText/);
});
test("v7.16 makes pass context explicit while leaving resolution authoritative", () => {
    assert.match(app, /Pass = add no response/);
    assert.match(app, /newest Chain item resolves first/);
    assert.match(app, /canPass:Boolean\(legal\.canPassPriority\)/);
});
test("v7.16 adds a Required Decision Desk for projected choices", () => {
    assert.match(app, /function requiredDecisionContext\(match\)/);
    assert.match(app, /RESOLUTION CHOICE/);
    assert.match(app, /DECK CHOICE/);
    assert.match(app, /TARGET CHOICE/);
    assert.match(app, /HAND CHOICE/);
    assert.match(app, /DECISION DESK/);
});
test("v7.16 keeps response and decision context compact on mobile", () => {
    assert.match(css, /\/\* v7\.16 response \+ decision readability polish \*\//);
    assert.match(css, /\.response-desk/);
    assert.match(css, /\.decision-desk/);
    assert.match(css, /@media \(max-width:800px\)[\s\S]*\.response-desk-stats,[\s\S]*\.decision-desk-stats \{ display:flex; overflow-x:auto/);
});
test("v7.16 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.16\.0"/);
    assert.match(html, /v7\.16 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.16 tests passed.`);
