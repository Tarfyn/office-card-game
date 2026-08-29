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
test("v5.4 persists unseen acquired cards per stable local player profile", () => {
    assert.match(app, /NEW_COLLECTION_KEY = 'office-card-game-new-collection-v1'/);
    assert.match(app, /function loadNewCollectionCards\(profile = state\.serverProfile\)/);
    assert.match(app, /collectionNewStorageKey\(owner\)/);
    assert.match(app, /function markCollectionCardSeen\(definitionId\)/);
    assert.match(app, /function markAllCollectionCardsSeen\(\)/);
});
test("v5.4 records genuinely new booster first copies before ownership changes obscure them", () => {
    assert.match(app, /const ownedBefore = new Map/);
    assert.match(app, /const newCardIds = \[\.\.\.new Set\(\(result\.cardIds/);
    assert.match(app, /state\.lastBooster = \{ \.\.\.result, newCardIds \}/);
    assert.match(app, /const newCardIds = new Set\(state\.lastBooster\.newCardIds \?\? \[\]\)/);
    assert.match(app, /newUnique/);
    assert.match(app, /duplicatePulls/);
});
test("v5.4 adds collection ownership filters plus acquisition and rarity sorting", () => {
    for (const value of ['OWNED', 'MISSING', 'NEW'])
        assert.match(app, new RegExp(`collectionOwnedFilter === '${value}'`));
    assert.match(app, /state\.collectionSort === 'NEW'/);
    assert.match(app, /state\.collectionSort === 'OWNED'/);
    assert.match(app, /state\.collectionSort === 'RARITY'/);
    assert.match(app, /New first/);
    assert.match(app, /Owned copies/);
});
test("v5.4 visually marks new cards and lets booster pulls open the inspector", () => {
    assert.match(app, /new-card-badge/);
    assert.match(app, /new-acquisition/);
    assert.match(app, /booster-inspect/);
    assert.match(app, /scrollIntoView\(\{ behavior:'smooth', block:'nearest' \}\)/);
    assert.match(css, /\.collection-card\.new-acquisition/);
    assert.match(css, /\.booster-hit\.new-pull/);
});
test("v5.4 keeps new markers lifecycle-safe across craft and sandbox reset", () => {
    assert.match(app, /if \(result && !wasOwned && ownedCopies\(definitionId\) > 0\) markCollectionCardsNew/);
    assert.match(app, /async function startEconomySandbox\(\)[\s\S]*clearNewCollectionCards\(\)/);
    assert.match(app, /async function resetEconomySandbox\(\)[\s\S]*clearNewCollectionCards\(\)/);
    assert.match(app, /Mark seen/);
});
test("v5.4 remains presentation-only with Ranked timer disabled and the Alpha pool intact", () => {
    assert.match(server, /version: "5\.4\.0"/);
    assert.match(html, /v5\.4 alpha playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
});
console.log(`${passed}/6 v5.4 tests passed.`);
