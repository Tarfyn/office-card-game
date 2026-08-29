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
test("v5.6 turns the phase rail into a readable completed/current/upcoming flow", () => {
    assert.match(app, /const MATCH_PHASE_FLOW = \['START','DRAW','MAIN','BATTLE','END'\]/);
    assert.match(app, /function renderPhaseTrack\(match\)/);
    assert.match(app, /index < currentIndex \? 'complete' : 'upcoming'/);
    assert.match(app, /MAIN:\{ title:'MAIN', hint:'Play cards' \}/);
    assert.match(css, /\.phase-track span\.complete/);
    assert.match(css, /\.phase-track span\.upcoming/);
});
test("v5.6 replaces technical phase-ending copy with player-facing transitions", () => {
    assert.match(app, /function phaseAdvanceLabel\(phase\)/);
    assert.match(app, /MAIN:'Go to Battle →'/);
    assert.match(app, /BATTLE:'Go to End →'/);
    assert.match(app, /END:'End turn →'/);
    assert.match(app, /phaseAdvanceLabel\(match\.phase\)/);
});
test("v5.6 command dock explains the next step and live action availability", () => {
    assert.match(app, /function actionAvailability\(match\)/);
    assert.match(app, /function currentActionPrompt\(match\)/);
    assert.match(app, /NEXT STEP/);
    assert.match(app, /PLAYABLE/);
    assert.match(app, /ATTACK/);
    assert.match(app, /RESPONSE/);
    assert.match(css, /\.action-availability/);
});
test("v5.6 labels playable hand cards and de-emphasizes unavailable Main-phase cards", () => {
    assert.match(app, /function legalHandActionLabel\(cardId\)/);
    assert.match(app, /return 'SET'/);
    assert.match(app, /return 'PLAY'/);
    assert.match(app, /card-play-hint/);
    assert.match(app, /function handZoneHint\(match\)/);
    assert.match(css, /\.own-hand\.actionable-hand \.card:not\(\.legal-card\)/);
});
test("v5.6 makes priority state explicit without changing Chain controls", () => {
    assert.match(app, /OPPONENT RESPONSE/);
    assert.match(app, /Opponent has priority/);
    assert.match(app, /Pass priority/);
    assert.match(app, /ACTIVATE_RESPONSE/);
    assert.match(app, /renderChainStack\(match\)/);
});
test("v5.6 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "5\.6\.0"/);
    assert.match(html, /v5\.6 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v5.6 tests passed.`);
