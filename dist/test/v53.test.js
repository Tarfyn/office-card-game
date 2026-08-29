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
const cards = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/cards.json", import.meta.url)), "utf8"));
const teamLead = cards.find((card) => card.id === "CS-006");
const head = cards.find((card) => card.id === "CS-007");
test("v5.3 adds local-only persistent contextual guidance with reset and opt-out", () => {
    assert.match(app, /GUIDANCE_KEY = 'office-card-game-guidance-v1'/);
    assert.match(app, /function loadGuidance\(\)/);
    assert.match(app, /function dismissGuidance\(id\)/);
    assert.match(app, /function setGuidanceEnabled\(enabled\)/);
    assert.match(app, /function resetGuidance\(\)/);
    assert.match(app, /localStorage\.setItem\(GUIDANCE_KEY/);
});
test("v5.3 covers the core first-match decisions without introducing new intents", () => {
    for (const id of ['MULLIGAN', 'HAND_LIMIT', 'RESPONSE', 'PROMOTION', 'PLAY_EMPLOYEE', 'SUPPORT', 'ONBOARDING', 'BATTLE'])
        assert.match(app, new RegExp(`id:'${id}'`));
    assert.match(app, /Promotion material is Archived, not Destroyed/);
    assert.match(app, /Direct attacks are only legal while the opponent controls no Employees/);
    assert.match(app, /Chain resolves newest effect first/);
});
test("v5.3 renders a concise lobby rules primer and contextual Office Coach", () => {
    assert.match(app, /function renderRulesPrimer\(\)/);
    assert.match(app, /How a turn works/);
    assert.match(app, /There is no Main Phase 2/);
    assert.match(app, /function renderGuidanceCoach\(match, tip = currentGuidanceTip\(match\)\)/);
    assert.match(app, /OFFICE COACH/);
    assert.match(css, /\.guidance-coach/);
    assert.match(css, /\.rules-primer-grid/);
});
test("v5.3 softly focuses the relevant existing board area and stays mobile-conscious", () => {
    assert.match(app, /guidance-focus-\$\{guidanceTip\.focus\}/);
    assert.match(css, /\.game-shell\.guidance-focus-hand \.own-hand/);
    assert.match(css, /\.game-shell\.guidance-focus-employees \.own-board \.employee-row/);
    assert.match(css, /\.game-shell\.guidance-focus-support \.own-board \.support-row/);
    assert.match(css, /@media \(max-width:700px\)/);
    assert.match(css, /\.guidance-actions \.ghost \{ display:none; \}/);
});
test("v5.3 keeps the v5.1 Power readability and Customer Service leadership data unchanged", () => {
    assert.equal(teamLead.cost?.play, 4);
    assert.equal(teamLead.power, 4);
    assert.equal(teamLead.abilities?.[0]?.appliesTo?.excludeSource, true);
    assert.equal(head.cost?.play, 6);
    assert.equal(head.power, 5);
    assert.match(app, /<span>POWER<\/span><b>\$\{esc\(power\.printed\)\}<\/b>/);
});
test("v5.3 remains presentation-only with Ranked timer disabled and the 97-card pool intact", () => {
    assert.match(server, /version: "5\.3\.0"/);
    assert.match(html, /v5\.3 alpha playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
});
console.log(`${passed}/6 v5.3 tests passed.`);
