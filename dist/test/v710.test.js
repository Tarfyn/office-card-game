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
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
// v7.10 keeps the sandbox tuning values unchanged and only improves navigation/readability.
test("v7.10 exposes deck-gap crafting context without inventing a deck score", () => {
    assert.match(app, /function cardCraftStatus\(definitionId, deck = editingDeck\(\)\)/);
    assert.match(app, /missingForDeck/);
    assert.match(app, /Scraps each ·/);
    assert.match(app, /data-deck-gap-craft=/);
    assert.match(app, /Wallet: \$\{esc\(state\.metaProfile\?\.balances\?\.SHREDDER_SCRAPS/);
});
test("v7.10 adds economy shortcuts as normal collection filters", () => {
    assert.match(app, /DECK_GAP/);
    assert.match(app, /SHREDDABLE/);
    assert.match(app, /Missing for deck/);
    assert.match(app, /Shred candidates/);
    assert.match(app, /function focusEconomyCollection\(kind\)/);
    assert.match(app, /data-economy-filter="DECK_GAPS"/);
    assert.match(app, /data-economy-filter="SHREDDABLE"/);
});
test("v7.10 shred candidates preserve collection-floor and current-deck safety", () => {
    assert.match(app, /state\.collectionOwnedFilter === 'SHREDDABLE'[\s\S]*ownedCopies\(def\.id\) > 0[\s\S]*deckCopies\(deck, def\.id\) === 0[\s\S]*scrapCollectionStatus\(def\.id, 1\)\.allowed/);
    assert.match(app, /savedDecksAffectedByScrap/);
    assert.match(app, /USED IN SAVED DECK/);
});
test("v7.10 collection preview explains craft wallet and shortfall", () => {
    assert.match(app, /SCRAPS <b>\$\{esc\(craft\.scraps\)\}/);
    assert.match(app, /DECK NEEDS/);
    assert.match(app, /Find shred candidates · \$\{esc\(craft\.shortfall\)\} Scraps short/);
    assert.match(app, /Craft −\$\{esc\(tier\?\.craftCost/);
});
test("v7.10 economy flow remains responsive", () => {
    assert.match(css, /\/\* v7\.10 collection \+ economy flow polish \*\//);
    assert.match(css, /\.economy-shortcuts/);
    assert.match(css, /\.deck-owned-gap-card/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.deck-owned-gaps > div:not\(\.deck-owned-gaps-head\)/);
});
test("v7.10 keeps rules and economy tuning unchanged", () => {
    assert.match(server, /version: "7\.10\.0"/);
    assert.match(html, /v7\.10 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    const tiers = Object.fromEntries(economy.rarityTiers.map((tier) => [tier.id, [tier.scrapValue, tier.craftCost]]));
    assert.deepEqual(tiers, { T0: [10, 150], T1: [25, 300], T2: [60, 600], T3: [150, 1200] });
});
console.log(`${passed}/6 v7.10 tests passed.`);
