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
test("v5.8 card inspector carries zone context and previous/next navigation", () => {
    assert.match(app, /function cardInspectionContext\(cardRef\)/);
    assert.match(app, /YOUR/);
    assert.match(app, /OPPONENT/);
    assert.match(app, /EMPLOYEE FIELD/);
    assert.match(app, /function navigateFocusedCard\(direction\)/);
    assert.match(app, /data-modal-nav="-1"/);
    assert.match(app, /data-modal-nav="1"/);
});
test("v5.8 inspector keyboard controls close and browse without changing board controls", () => {
    assert.match(app, /event\.key === 'Escape'/);
    assert.match(app, /event\.key === 'ArrowLeft' \|\| event\.key === 'ArrowRight'/);
    assert.match(app, /openCardInspector\(cardRef\)/);
    assert.match(app, /closeCardInspector\(\)/);
    assert.match(app, /data-play-hand/);
    assert.match(app, /data-attack-source/);
});
test("v5.8 inspector exposes only existing legal server-authoritative actions", () => {
    assert.match(app, /function modalCardActions\(card\)/);
    assert.match(app, /legalHandActionLabel\(card\.instanceId\)/);
    assert.match(app, /legalAttackSourceIds\(\)\.has\(card\.instanceId\)/);
    assert.match(app, /legalAbilityOption\(card\.instanceId\)/);
    assert.match(app, /legalResponseOption\(card\.instanceId\)/);
    assert.match(app, /Actions use the same server-authoritative legal move list as the board/);
});
test("v5.8 keeps read-only sessions and hidden Support safe inside inspection", () => {
    assert.match(app, /const controls = viewerHasControl\(\)/);
    assert.match(app, /This browser tab is read-only/);
    assert.match(app, /Face-down Incident/);
    assert.match(app, /Hidden information/);
    assert.match(app, /if \(!card \|\| !def\)/);
});
test("v5.8 inspector and hover interaction styling remains responsive and focus-visible", () => {
    assert.match(css, /v5\.8 card interaction \+ inspector polish/);
    assert.match(css, /\.inspector-nav/);
    assert.match(css, /\.inspector-action-bar/);
    assert.match(css, /\.card\[data-card-info\]:focus-visible/);
    assert.match(css, /\.hover-inspect-hint/);
    assert.match(css, /@media \(max-width: 950px\)/);
});
test("v5.8 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "5\.8\.0"/);
    assert.match(html, /v5\.8 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v5.8 tests passed.`);
