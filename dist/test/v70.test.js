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
test("v7.0 introduces one reusable static card face for collection and booster surfaces", () => {
    assert.match(app, /function renderCatalogCardFace\(def,/);
    assert.match(app, /catalog-type-strip/);
    assert.match(app, /catalog-name-row/);
    assert.match(app, /catalog-art-stage/);
    assert.match(app, /catalog-power-badge/);
    assert.match(css, /\/\* v7\.0 card-system visual unification/);
});
test("v7.0 collection cards reuse Cost, Power, Department and rarity vocabulary from live cards", () => {
    assert.match(app, /renderCollectionCard[\s\S]*renderCatalogCardFace\(def, \{ tier, isNew, artReady:Boolean\(def\.artId\), owned \}\)/);
    assert.match(app, /card-cost-badge catalog-cost/);
    assert.match(app, /catalog-power-badge[\s\S]*POWER/);
    assert.match(app, /raritySignal\(def, rarity, true\)/);
    assert.match(css, /\.collection-card \.catalog-card-face/);
});
test("v7.0 booster reveals use the same compact static card frame instead of a separate pseudo-card layout", () => {
    assert.match(app, /renderCatalogCardFace\(def, \{ tier, compact:true, isNew, artReady:Boolean\(def\.artId\), owned:ownedCopies\(id\) \}\)/);
    assert.match(css, /\.booster-hit\.revealed \.catalog-card-face/);
    assert.match(css, /\.catalog-card-face\.compact/);
    assert.match(css, /\.booster-hit\.revealed\.tier-t3/);
});
test("v7.0 deck rows use the same Department, Tier, Cost and Power labels as cards", () => {
    assert.match(app, /deck-list-card-copy/);
    assert.match(app, /COST \$\{esc\(definitionCost\(def\)\)\}/);
    assert.match(app, /POWER \$\{esc\(def\.power\)\}/);
    assert.match(app, /tier-\$\{esc\(String\(tier\)\.toLowerCase\(\)\)\}/);
    assert.match(css, /\.deck-list-row\.type-employee::before/);
    assert.match(css, /\.deck-list-card-copy > small i/);
});
test("v7.0 keeps live match power readability and board card rendering intact", () => {
    assert.match(app, /function renderPowerDisplay\(card, def\)/);
    assert.match(app, /current-power-badge/);
    assert.match(app, /function renderCard\(card,/);
    assert.match(app, /renderPowerDisplay\(card, def\)/);
    assert.doesNotMatch(app, /draggable="true"|dragstart/);
});
test("v7.0 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "7\.0\.0"/);
    assert.match(html, /v7\.0 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v7.0 tests passed.`);
