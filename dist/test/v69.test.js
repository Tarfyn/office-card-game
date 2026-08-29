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
test("v6.9 consolidates mobile turn, phase and battlefield navigation into one compact sticky HUD", () => {
    assert.match(app, /function renderMobileBoardNav\(match\)/);
    assert.match(app, /mobile-match-hud/);
    assert.match(app, /mobile-phase-dots/);
    assert.match(app, /Turn \$\{esc\(match\.turnNumber\)\} · \$\{esc\(match\.phase\)\}/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.turn-banner,\.phase-track \{ display:none; \}[\s\S]*\.mobile-board-nav \{[\s\S]*top:52px/);
});
test("v6.9 preserves the three existing mobile jump targets and adds active-section feedback", () => {
    assert.match(app, /data-mobile-jump="opponentBoard"/);
    assert.match(app, /data-mobile-jump="decisionCenter"/);
    assert.match(app, /data-mobile-jump="ownBoard"/);
    assert.match(app, /IntersectionObserver/);
    assert.match(app, /aria-current','location'/);
    assert.match(css, /\.mobile-board-nav button\.active,\.mobile-board-nav button\[aria-current="location"\]/);
});
test("v6.9 removes duplicated large mobile resource cards while retaining compact vitals and Archive access", () => {
    assert.match(app, /function renderPlayerVitals\(player\)/);
    assert.match(app, /REP/);
    assert.match(app, /CAP/);
    assert.match(app, /HAND/);
    assert.match(app, /DECK/);
    assert.match(css, /\.player-board \.resource-cluster \{ display:none; \}/);
    assert.match(css, /\.player-board \.board-resource-row \.deck-pile \{ display:none; \}/);
    assert.match(css, /\.archive-compact summary \{ min-height:31px/);
});
test("v6.9 reduces normal mobile presence and activity chrome without hiding reconnect warnings", () => {
    assert.match(css, /\.presence-pill\.connected \{ display:none; \}/);
    assert.match(css, /\.presence-pill\.disconnected,\.presence-pill\.waiting \{ display:inline-flex; \}/);
    assert.match(css, /\.match-feed-heading \{ display:none; \}/);
    assert.match(css, /\.match-feed-item,\.match-feed-item:nth-child\(n\) \{ display:none; \}/);
    assert.match(css, /\.match-feed-item\.latest \{[\s\S]*display:grid/);
});
test("v6.9 keeps mobile board rails and touch interaction model intact", () => {
    assert.match(css, /grid-auto-columns:138px/);
    assert.match(css, /scroll-snap-type:x proximity/);
    assert.match(css, /\.own-hand[\s\S]*overflow-x:auto/);
    assert.match(app, /target\.scrollIntoView\(\{ behavior:'smooth', block:'start' \}\)/);
    assert.doesNotMatch(app, /dragstart|draggable="true"/);
});
test("v6.9 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "6\.9\.0"/);
    assert.match(html, /v6\.9 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v6.9 tests passed.`);
