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
test("v5.7 gives Employee field cards explicit onboarding, ready, used and ability states", () => {
    assert.match(app, /function fieldCardStateBadges\(card, def/);
    assert.match(app, /ONBOARDING/);
    assert.match(app, /ATTACK READY/);
    assert.match(app, /ATTACK USED/);
    assert.match(app, /ABILITY READY/);
    assert.match(app, /field-state-row/);
});
test("v5.7 distinguishes persistent Systems from set Incidents without leaking hidden identity", () => {
    assert.match(app, /SYSTEM LIVE/);
    assert.match(app, /INCIDENT SET/);
    assert.match(app, /function hiddenSupportBack\(\)/);
    assert.match(app, /FACE-DOWN SUPPORT/);
    assert.match(app, /hidden && faceDownSupport \? hiddenSupportBack\(\) : ''/);
    assert.match(css, /\.hidden-support-back/);
});
test("v5.7 summarizes board occupancy and labels empty field slots by zone", () => {
    assert.match(app, /function fieldZoneSummary\(player, zone, own\)/);
    assert.match(app, /attack ready/);
    assert.match(app, /systemCount/);
    assert.match(app, /incidentCount|setCount/);
    assert.match(app, / live`/);
    assert.match(app, / set`/);
    assert.match(app, /const slotName = zone === 'EMPLOYEE' \? `Employee \$\{slot \+ 1\}` : `Support \$\{slot \+ 1\}`/);
    assert.match(css, /\.field-empty:not\(\.slot-candidate\)/);
});
test("v5.7 mirrors turn and priority ownership on the player boards", () => {
    assert.match(app, /function boardStatePills\(playerId, match\)/);
    assert.match(app, /board-state-pill turn/);
    assert.match(app, /board-state-pill priority/);
    assert.match(app, /player-head-status/);
    assert.match(css, /\.board-state-pill\.turn/);
    assert.match(css, /\.board-state-pill\.priority/);
});
test("v5.7 field-state styling keeps Support and Employee runtime cues visually distinct", () => {
    assert.match(css, /\.runtime-badge\.system-live/);
    assert.match(css, /\.runtime-badge\.incident-set/);
    assert.match(css, /\.runtime-badge\.ability-state/);
    assert.match(css, /\.runtime-badge\.attacks\.used/);
    assert.match(css, /\.card\.face-down-support:not\(\.hidden-card\)/);
});
test("v5.7 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "5\.7\.0"/);
    assert.match(html, /v5\.7 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v5.7 tests passed.`);
