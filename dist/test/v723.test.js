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
test("v7.23 keeps targeted interaction sources explicit through target selection", () => {
    assert.match(app, /function beginTargetIntent\(label, targetChoices, buildIntent, sourceId = null\)/);
    assert.match(app, /state\.interaction = \{ type:'TARGETS', label, sourceId, targetChoices, index:0, selections:\{\}, buildIntent \}/);
    assert.match(app, /function interactionSourceId\(\)/);
    assert.match(app, /if \(interaction\.type === 'TARGETS'\) return interaction\.sourceId \?\? null/);
    assert.match(app, /item\.targetChoices,[\s\S]*item\.sourceId\)/);
});
test("v7.23 uses one source target selected role language", () => {
    assert.match(app, /function renderInteractionRoleLegend/);
    assert.match(app, /SOURCE/);
    assert.match(app, /targetLabel:'EMPLOYEE SLOT'/);
    assert.match(app, /targetLabel:'SUPPORT SLOT'/);
    assert.match(app, /targetLabel:'MATERIALS'/);
    assert.match(app, /SELECTED \$\{selected\}\/\$\{max\}/);
    assert.match(css, /\.interaction-role-legend/);
    assert.match(css, /\.card\.interaction-source::before \{ content:'SOURCE'/);
});
test("v7.23 makes projected hand-choice candidates explicit", () => {
    assert.match(app, /function handSelectionRole\(match, instanceId\)/);
    assert.match(app, /return 'MULLIGAN'/);
    assert.match(app, /return 'ARCHIVE'/);
    assert.match(app, /return 'CHOICE'/);
    assert.match(app, /const selectAttr = selectable && selectionCandidate/);
    assert.match(app, /selection-candidate selection-kind-/);
    assert.match(css, /\.own-hand\.selection-mode \.card:not\(\.selection-candidate\)/);
});
test("v7.23 keeps source visible and selected states semantically distinct", () => {
    assert.match(css, /interaction-targets \.player-board \.card:not\(\.target-candidate\):not\(\.target-selected\):not\(\.interaction-source\)/);
    assert.match(css, /\.card\.target-selected::before \{ content:'SELECTED'/);
    assert.match(css, /selection-kind-archive\.selection-selected::before \{ content:'ARCHIVE'/);
    assert.match(css, /selection-kind-choice\.selection-selected::before \{ content:'SELECTED'/);
});
test("v7.23 exposes selection state accessibly and stays mobile-safe", () => {
    assert.match(app, /aria-pressed=/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.interaction-role-legend/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.card\.interaction-source/);
});
test("v7.23 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.23\.0"/);
    assert.match(html, /v7\.23 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.23 tests passed.`);
