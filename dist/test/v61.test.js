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
const decks = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/decks.json", import.meta.url)), "utf8"));
test("v6.1 turns the free mulligan into a clearer keep/replace opening decision", () => {
    assert.match(app, /FREE MULLIGAN · ONCE/);
    assert.match(app, /mulligan-meter/);
    assert.match(app, /Keep this hand/);
    assert.match(app, /mulligan-clear/);
    assert.match(app, /Replace \$\{selected\}/);
    assert.match(css, /\.mulligan-panel\.has-selection/);
});
test("v6.1 gives confirmed opening hands an explicit locked waiting state", () => {
    assert.match(app, /match\.status === 'SETUP' && !legal\.canMulligan/);
    assert.match(app, /HAND LOCKED/);
    assert.match(app, /Opening hand confirmed/);
    assert.match(css, /\.opening-wait-panel/);
    assert.match(css, /opening-wait-spin/);
});
test("v6.1 surfaces opener identity and first-player draw rule in match opening presentation", () => {
    assert.match(app, /const openerIsYou = match\.firstPlayerId === match\.viewerId/);
    assert.match(app, /THE OFFICE OPENS/);
    assert.match(app, /First player skips the first Draw/);
    assert.match(app, />VS</);
    assert.match(css, /\.match-opening-center em/);
});
test("v6.1 drives turn handoff presentation from existing TURN_STARTED events only", () => {
    assert.match(app, /flowCue: null/);
    assert.match(app, /event\.type === 'TURN_STARTED'/);
    assert.match(app, /function renderTurnFlowCue\(match\)/);
    assert.match(app, /YOUR TURN/);
    assert.match(app, /OPPONENT TURN/);
    assert.match(app, /renderTurnFlowCue\(match\)/);
});
test("v6.1 themes turn transitions by department and respects reduced motion", () => {
    assert.match(css, /\.turn-flow-cue\.dept-customer_service/);
    assert.match(css, /\.turn-flow-cue\.dept-marketing/);
    assert.match(css, /@keyframes turn-flow-in/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /@keyframes turn-flow-fade/);
});
test("v6.1 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "6\.1\.0"/);
    assert.match(html, /v6\.1 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v6.1 tests passed.`);
