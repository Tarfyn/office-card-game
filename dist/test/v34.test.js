import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { applyScrap, collectionPlayableCapacity, createEconomySandboxProfile, scrapEligibility, seedOwnedCollection } from "../src/economy.js";
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
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const rules = {
    deckSize: ALPHA_FORMAT.deckSize,
    defaultCopyLimit: ALPHA_FORMAT.defaultCopyLimit,
    cardLimits: ALPHA_FORMAT.cardLimits,
    legalDefinitionIds: Object.keys(alphaDefinitions)
};
test("v3.4 sandbox starter collection begins with exactly one legal playable deck", () => {
    const starter = alphaDeckPresets[economy.sandbox.starterCollectionDeckId];
    assert.ok(starter);
    const profile = seedOwnedCollection(createEconomySandboxProfile(500), starter.cards);
    assert.equal(collectionPlayableCapacity(profile, rules), 40);
    assert.equal(starter.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
test("v3.4 collection floor permits shredding a last copy when another legal deck still remains", () => {
    const starter = alphaDeckPresets[economy.sandbox.starterCollectionDeckId];
    let profile = seedOwnedCollection(createEconomySandboxProfile(0), starter.cards);
    profile.ownedCards["IT-001"] = 1;
    assert.equal(collectionPlayableCapacity(profile, rules), 41);
    const eligibility = scrapEligibility(profile, "IT-001", 1, rules);
    assert.equal(eligibility.allowed, true);
    profile = applyScrap(profile, "IT-001", 1, 10, rules);
    assert.equal(profile.ownedCards["IT-001"], undefined);
    assert.equal(collectionPlayableCapacity(profile, rules), 40);
});
test("v3.4 collection floor blocks a shred that would remove the last legal 40-card deck", () => {
    const starter = alphaDeckPresets[economy.sandbox.starterCollectionDeckId];
    const profile = seedOwnedCollection(createEconomySandboxProfile(0), starter.cards);
    const target = starter.cards.find((entry) => entry.copies > 0);
    const eligibility = scrapEligibility(profile, target.definitionId, 1, rules);
    assert.equal(eligibility.allowed, false);
    assert.equal(eligibility.playableCapacityAfter, 39);
    assert.match(eligibility.reason ?? "", /one legal 40-card deck/i);
});
test("v3.4 playable capacity respects copy limits so excess duplicates do not fake the floor", () => {
    const profile = createEconomySandboxProfile(0);
    profile.ownedCards["CS-001"] = 40;
    assert.equal(collectionPlayableCapacity(profile, rules), 3);
});
test("v3.4 browser exposes collection floor and saved-deck shred warning instead of three-copy protection", () => {
    assert.match(app, /function collectionPlayableCapacity/);
    assert.match(app, /function savedDecksAffectedByScrap/);
    assert.match(app, /USED IN SAVED DECK/);
    assert.match(app, /This card may go to 0 copies/);
    assert.doesNotMatch(app, /first \$\{protectedCopies\} playable copies/);
    assert.match(css, /v3\.4 collection-floor shredding \+ saved-deck warning/);
});
test("v3.4 server enforces Alpha collection floor authoritatively", () => {
    assert.match(server, /const alphaScrapRules/);
    assert.match(server, /scrapEligibility\((?:body\.profile|context\.meta), card\.id, copies, alphaScrapRules\)/);
    assert.match(server, /COLLECTION_FLOOR/);
    assert.match(server, /seedOwnedCollection\(profile, starter\.cards\)/);
});
test("v3.4 economy config removes three-copy protection and allows specialization", () => {
    assert.equal(economy.crafting.allowScrapLastOwnedCopy, true);
    assert.equal(economy.crafting.minimumPlayableDecks, 1);
    assert.equal(economy.crafting.collectionFloor, "ONE_LEGAL_FORMAT_DECK");
    assert.equal("protectPlayableSetCopies" in economy.crafting, false);
});
test("v3.4 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/8 v3.4 tests passed.`);
