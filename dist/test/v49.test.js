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
test("v4.9 collection uses the same derived sandbox rarity model as the economy", () => {
    assert.match(app, /function sandboxRarityTier\(def\)/);
    assert.match(app, /def\?\.rank === 'EXECUTIVE' \|\| cost >= 5/);
    assert.match(app, /def\?\.rank === 'LEAD' \|\| cost >= 4/);
    assert.match(app, /collection-card catalog-frame/);
    assert.match(app, /rarity-chip tier-/);
    assert.match(css, /\.collection-card\.catalog-frame\.tier-t3/);
});
test("v4.9 booster opening reveals pulls progressively with a chase foil treatment", () => {
    assert.match(app, /boosterRevealCount/);
    assert.match(app, /data-booster-reveal/);
    assert.match(app, /revealAllBooster/);
    assert.match(app, /booster-card-back/);
    assert.match(app, /foil-sheen/);
    assert.match(css, /@keyframes booster-card-reveal/);
    assert.match(css, /\.booster-facedown\.next-reveal/);
});
test("v4.9 collection presentation shows owned and artwork set progress", () => {
    assert.match(app, /function collectionSetStats\(\)/);
    assert.match(app, /uniqueOwned/);
    assert.match(app, /artReady/);
    assert.match(app, /collection-set-progress/);
    assert.equal((app.match(/<aside class="deck-builder-panel">/g) ?? []).length, 1);
});
test("v4.9 reputation and breakthrough polish reads current engine event fields", () => {
    assert.match(app, /event\.data\?\.excessPower/);
    assert.match(app, /event\.data\?\.delta/);
    assert.match(app, /function reputationImpactClass\(playerId\)/);
    assert.match(css, /\.cue-reputation-loss/);
    assert.match(css, /@keyframes reputation-hit/);
});
test("v4.9 match result presentation adds emblem and final reputation scoreline", () => {
    assert.match(app, /match-result-emblem/);
    assert.match(app, /match-scoreline/);
    assert.match(app, /COMPANY REPUTATION/);
    assert.match(css, /\.match-result-emblem/);
    assert.match(css, /\.match-scoreline/);
});
test("v4.9 remains a visual polish release with Ranked timer disabled", () => {
    assert.match(server, /version: "4\.9\.0"/);
    assert.match(html, /v4\.9 alpha playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.equal(settings.ranked.enabled, true);
});
console.log(`${passed}/6 v4.9 tests passed.`);
