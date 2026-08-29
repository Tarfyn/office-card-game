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
test("v6.4 expands the completed-match review with readable match facts", () => {
    assert.match(app, /class="match-result-summary"/);
    assert.match(app, /TURNS/);
    assert.match(app, /DURATION/);
    assert.match(app, /SEAT/);
    assert.match(app, /FINAL REP/);
    assert.match(app, /matchEndReasonLabel/);
    assert.match(css, /\.match-result-summary/);
});
test("v6.4 makes rated movement readable as before-to-after without changing rating settlement", () => {
    assert.match(app, /ratingAfter - rankedReceipt\.ratingDelta/);
    assert.match(app, /MMR ·/);
    assert.match(app, /Private Ranked rules · unrated/);
    assert.doesNotMatch(app, /clientRatingSettlement/);
});
test("v6.4 surfaces profile reward progress in the result without changing reward values", () => {
    assert.match(app, /levelXpStep/);
    assert.match(app, /class="xp-track"/);
    assert.match(app, /OFFICE_CREDITS/);
    assert.match(app, /Pending · claim once for this completed room/);
    assert.match(css, /\.xp-track/);
});
test("v6.4 offers a same-deck same-mode next-match path and keeps claiming explicit", () => {
    assert.match(app, /function playAnotherMatch\(\)/);
    assert.match(app, /Claim \+ play another/);
    assert.match(app, /state\.preferredDeckValue = deckValue/);
    assert.match(app, /state\.lobbyMatchMode = state\.view\?\.settings\?\.mode === 'RANKED' \? 'RANKED' : 'FRIENDLY'/);
    assert.match(app, /claimMatchReward\(\{ renderAfter:false \}\)/);
    assert.match(app, /Same deck and match mode are selected/);
});
test("v6.4 keeps review and normal lobby exit alongside the post-match continuation", () => {
    assert.match(app, /id="reviewCurrentMatch"/);
    assert.match(app, /id="resultBackLobby"/);
    assert.match(app, /id="resultPlayAnother"/);
    assert.match(app, /addEventListener\('click', playAnotherMatch\)/);
    assert.match(css, /@media \(max-width:760px\)/);
    assert.match(css, /prefers-reduced-motion/);
});
test("v6.4 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "6\.4\.0"/);
    assert.match(html, /v6\.4 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v6.4 tests passed.`);
