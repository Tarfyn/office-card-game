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
test("v6.8 separates Quick Match copy from controls so nested lobby widths cannot collide", () => {
    assert.match(app, /quick-match-copy/);
    assert.match(app, /quick-match-controls/);
    assert.match(app, /quick-match-field quick-match-deck/);
    assert.match(app, /quick-match-field quick-match-mode/);
    assert.match(css, /\.quick-match-controls\s*\{[\s\S]*grid-template-columns:minmax\(0,1\.5fr\) minmax\(118px,\.62fr\) max-content/);
});
test("v6.8 lets long deck selects shrink inside the Quick Match grid instead of forcing overlap", () => {
    assert.match(css, /\.quick-match-field select\s*\{[\s\S]*min-width:0;[\s\S]*max-width:100%/);
    assert.match(css, /text-overflow:ellipsis/);
    assert.match(css, /\.quick-match-controls,[\s\S]*\.quick-match-controls > \* \{ min-width:0; \}/);
});
test("v6.8 has component-width fallbacks for intermediate and narrow Quick Match layouts", () => {
    assert.match(css, /container-type:inline-size/);
    assert.match(css, /@container \(max-width:620px\)[\s\S]*\.quick-match-controls > button \{ grid-column:1\/-1; width:100%; \}/);
    assert.match(css, /@container \(max-width:430px\)[\s\S]*\.quick-match-controls \{ grid-template-columns:1fr; \}/);
});
test("v6.8 preserves the full selected deck or mode label as a browser tooltip", () => {
    assert.match(app, /function syncSelectDisplayTitle\(select\)/);
    assert.match(app, /option\?\.textContent\?\.trim\(\)/);
    assert.match(app, /function bindResponsiveLobbySelects\(\)/);
    assert.match(app, /\['quickDeck','quickMode','createDeck','createMode','joinDeck'\]/);
    assert.match(app, /bindResponsiveLobbySelects\(\);/);
});
test("v6.8 applies the same shrink-safe form behavior to private-room controls", () => {
    assert.match(css, /\.lobby-command-center select,[\s\S]*\.lobby-command-center input \{ min-width:0; max-width:100%; \}/);
    assert.match(css, /\.private-room-grid \.box > button \{ width:100%; \}/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.private-room-grid \.field select,[\s\S]*\.private-room-grid \.field input/);
});
test("v6.8 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "6\.8\.0"/);
    assert.match(html, /v6\.8 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v6.8 tests passed.`);
