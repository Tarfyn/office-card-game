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
test("v7.13 adds objective Main-phase action context", () => {
    assert.match(app, /function mainPhaseHandContext\(match\)/);
    assert.match(app, /MAIN DESK/);
    assert.match(app, /PLAYABLE/);
    assert.match(app, /EMP SLOTS/);
    assert.match(app, /SUPPORT SLOTS/);
    assert.match(app, /PRINTED COST &gt; CAP/);
    assert.match(app, /renderMainPhaseContext\(match\)/);
});
test("v7.13 keeps hand legality server-projected instead of parsing rules text", () => {
    assert.match(app, /const legalIds = legalHandCardIds\(\)/);
    assert.match(app, /highlighted cards are live-legal/);
    assert.match(app, /The live legal-action list remains authoritative/);
    assert.doesNotMatch(app, /parseRulesText|interpretRulesText|evaluateRulesText/);
});
test("v7.13 gives safe unavailable-card context in the Inspector", () => {
    assert.match(app, /function handCardAvailabilityNote\(card, def\)/);
    assert.match(app, /DECISION FIRST/);
    assert.match(app, /RESPONSE FIRST/);
    assert.match(app, /WAIT FOR TURN/);
    assert.match(app, /MAIN PHASE/);
    assert.match(app, /CAPACITY CONTEXT/);
    assert.match(app, /No legal play offered from this card/);
});
test("v7.13 exposes printed-cost pressure without claiming it is the sole legality reason", () => {
    assert.match(app, /function handCardContextBadge\(card, def\)/);
    assert.match(app, /COST &gt; CAP/);
    assert.match(app, /Printed cost is above current Capacity\. Cost modifiers can still affect live availability\./);
    assert.match(app, /printedOverCapacity/);
});
test("v7.13 Main Desk remains compact on mobile", () => {
    assert.match(css, /\/\* v7\.13 main-phase decision readability polish \*\//);
    assert.match(css, /\.main-phase-context/);
    assert.match(css, /\.main-phase-context-stats/);
    assert.match(css, /@media \(max-width:800px\)[\s\S]*\.main-phase-context-stats \{ display:flex; overflow-x:auto/);
    assert.match(css, /\.card-block-hint/);
});
test("v7.13 remains a presentation-only release with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.13\.0"/);
    assert.match(html, /v7\.13 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.13 tests passed.`);
