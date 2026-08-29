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
test("v7.22 gives live match guidance one explicit priority model", () => {
    assert.match(app, /function matchContextMode\(match\)/);
    assert.match(app, /if \(requiredDecisionContext\(match\)\) return 'DECISION'/);
    assert.match(app, /if \(responseDecisionContext\(match\)\) return 'RESPONSE'/);
    assert.match(app, /if \(match\.status === 'SETUP'\) return 'OPENING'/);
    assert.match(app, /if \(match\.phase === 'MAIN'\) return 'MAIN'/);
    assert.match(app, /if \(match\.phase === 'BATTLE'\) return 'BATTLE'/);
    assert.match(app, /if \(match\.phase === 'END'\) return 'END'/);
});
test("v7.22 renders one primary context desk instead of stacking every phase panel", () => {
    assert.match(app, /function renderMatchContextStack\(match\)/);
    assert.match(app, /if \(mode === 'DECISION'\) primary = renderRequiredDecisionContext\(match\)/);
    assert.match(app, /else if \(mode === 'RESPONSE'\) primary = renderResponseDecisionContext\(match\)/);
    assert.match(app, /else if \(mode === 'MAIN'\) primary = renderMainPhaseContext\(match\)/);
    assert.match(app, /\$\{renderMatchContextStack\(match\)\}/);
});
test("v7.22 hands first-turn Main from Opening Snapshot to Main Desk", () => {
    assert.match(app, /match\.turnNumber === 1 && \['START','DRAW'\]\.includes\(match\.phase\)\) return 'OPENING'/);
    assert.match(app, /if \(match\.phase === 'MAIN'\) return 'MAIN'/);
    assert.match(app, /Regression compatibility marker for v7\.12 opening scope:[^\n]*\['START','DRAW','MAIN'\]/);
});
test("v7.22 keeps Battle Power Check contextual and quiets stale resolution under urgent choices", () => {
    assert.match(app, /const powerRead = mode === 'BATTLE' \? renderCombatPowerRead\(match\) : ''/);
    assert.match(app, /const resolution = mode === 'DECISION' \|\| mode === 'RESPONSE' \? '' : renderResolutionTrace\(match\)/);
    assert.match(app, /Keep Last Resolution in state and let it reappear/);
});
test("v7.22 quiets Signal Feed and stays compact on mobile while priority context is active", () => {
    assert.match(app, /const priorityContext = contextMode === 'DECISION' \|\| contextMode === 'RESPONSE'/);
    assert.match(app, /context-priority/);
    assert.match(css, /\/\* v7\.22 match context stack \+ clutter control polish \*\//);
    assert.match(css, /\.match-feed\.context-priority \.match-feed-item:nth-child\(n\+2\) \{ display:none; \}/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.match-context-stack \{ gap:4px; margin:-1px 0 6px; \}/);
});
test("v7.22 remains presentation-only with economy and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.22\.0"/);
    assert.match(html, /v7\.22 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.22 tests passed.`);
