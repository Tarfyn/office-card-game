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
test("v7.9 adds a compact match-prep summary for selected lobby decks", () => {
    assert.match(app, /function lobbyDeckSummary\(value = state\.preferredDeckValue\)/);
    assert.match(app, /function renderLobbyDeckPrep\(value, context = 'QUICK'\)/);
    assert.match(app, /MATCH DECK/);
    assert.match(app, /FORMAT READY/);
    assert.match(app, /COLLECTION READY/);
});
test("v7.9 places deck prep on quick match create and join surfaces", () => {
    assert.match(app, /data-lobby-deck-prep-host="QUICK"/);
    assert.match(app, /data-lobby-deck-prep-host="CREATE"/);
    assert.match(app, /data-lobby-deck-prep-host="JOIN"/);
    assert.match(app, /renderLobbyDeckPrep\(preferredDeck,'QUICK'\)/);
});
test("v7.9 synchronizes the active deck across lobby play forms", () => {
    assert.match(app, /function syncLobbyDeckChoice\(value\)/);
    assert.match(app, /\['quickDeck','createDeck','joinDeck'\]/);
    assert.match(app, /state\.preferredDeckValue = resolved/);
    assert.match(app, /syncLobbyDeckChoice\(event\.target\.value\)/);
});
test("v7.9 preflights format-invalid drafts before multiplayer requests", () => {
    assert.match(app, /Selected deck is not format-ready[\s\S]*before matchmaking/);
    assert.match(app, /Selected deck is not format-ready[\s\S]*before creating a room/);
    assert.match(app, /Selected deck is not format-ready[\s\S]*before joining a room/);
    assert.match(app, /quick\.disabled = state\.matchmakingBusy \|\| !legal/);
});
test("v7.9 keeps match prep responsive and compact", () => {
    assert.match(css, /\/\* v7\.9 match prep \+ deck selection polish \*\//);
    assert.match(css, /\.lobby-deck-prep/);
    assert.match(css, /\.lobby-deck-prep-status/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.lobby-deck-prep \{ grid-template-columns:auto minmax\(0,1fr\)/);
});
test("v7.9 stays lobby-UX-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.9\.0"/);
    assert.match(html, /v7\.9 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v7.9 tests passed.`);
