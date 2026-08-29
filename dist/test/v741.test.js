import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
import { loadCardDefinitions } from "../src/cards.js";
import { loadDeckPresets } from "../src/decks.js";
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const cards = JSON.parse(root("data/cards.json"));
const decks = JSON.parse(root("data/decks.json"));
test("v7.41 preset API model exposes five complete 40-card starters", () => {
    const definitions = loadCardDefinitions();
    const presets = loadDeckPresets();
    const rooms = new RoomService({ definitions, presets });
    const listed = rooms.listPresets();
    assert.equal(listed.length, 5);
    for (const preset of listed) {
        assert.equal(preset.cards.reduce((sum, entry) => sum + Number(entry.copies || 0), 0), 40);
    }
});
test("v7.41 keeps the full 107-card Expansion I roster in the deckbuilder catalog", () => {
    assert.equal(cards.length, 107);
    for (const id of ["CS-021", "CS-022", "IT-021", "OFC-016", "OFC-017", "MKT-016", "MKT-017", "PRD-016", "PRD-017", "N-015"]) {
        assert.ok(cards.some((card) => card.id === id), `${id} missing`);
    }
});
test("v7.41 lobby deckbuilder entry normalizes to full Alpha roster", () => {
    assert.match(app, /async function enterAlphaDeckbuilder\(message = null\)/);
    assert.match(app, /resetCollectionFilters\(\);[\s\S]*ownedDeckMode\(\)[\s\S]*setCollectionMode\('SANDBOX_ALL_AVAILABLE'\)/);
    assert.match(app, /openCollection'\)\.onclick = async \(\) => \{ await enterAlphaDeckbuilder\(\); \}/);
});
console.log(`${passed}/3 v7.41 hotfix tests passed.`);
