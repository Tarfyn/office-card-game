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
test("v6.5 gives the existing mirrored board one cohesive battlefield surface without reordering it", () => {
    assert.match(app, /class="battlefield-surface" aria-label="Office battlefield"/);
    assert.match(app, /battlefield-surface[\s\S]*renderPlayer\(them,false,match\)[\s\S]*renderDecisionCenter\(match\)[\s\S]*renderPlayer\(me,true,match\)/);
    assert.match(css, /\.battlefield-surface \{/);
    assert.match(css, /\.battlefield-surface \.player-board \{ margin-bottom:0; \}/);
});
test("v6.5 adds desk-state emphasis from existing active-player and priority state only", () => {
    assert.match(app, /match\.activePlayerId === player\.id \? ' desk-active' : ''/);
    assert.match(app, /match\.priorityPlayerId === player\.id \? ' desk-priority' : ''/);
    assert.match(css, /\.player-board\.desk-active/);
    assert.match(css, /\.player-board\.desk-priority/);
    assert.doesNotMatch(app, /setDeskActive|clientDeskState/);
});
test("v6.5 makes Employee and Support rows distinct visual lanes while preserving slot geometry", () => {
    assert.match(app, /board-lane employee-lane/);
    assert.match(app, /board-lane support-lane/);
    assert.match(app, /aria-label="\$\{own \? 'Your' : 'Opponent'\} employee row"/);
    assert.match(css, /\.employee-lane/);
    assert.match(css, /\.support-lane/);
    assert.match(css, /calc\(20% - 1px\)/);
    assert.match(css, /calc\(25% - 1px\)/);
});
test("v6.5 unifies resources, piles and shared center as spatial surfaces instead of debug boxes", () => {
    assert.match(css, /\.battlefield-surface \.resource-cluster/);
    assert.match(css, /\.battlefield-surface \.board-resource-row/);
    assert.match(css, /\.battlefield-surface \.deck-pile/);
    assert.match(css, /\.battlefield-surface \.archive-compact/);
    assert.match(css, /\.battlefield-surface \.office-divider/);
    assert.match(css, /\.battlefield-surface \.decision-center/);
});
test("v6.5 keeps swipe-first mobile geometry and reduced-motion support", () => {
    assert.match(css, /@media \(max-width:760px\)[\s\S]*\.battlefield-surface/);
    assert.match(css, /scrollbar-color:rgba\(112,101,88,\.28\) transparent/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.battlefield-surface \.player-board/);
    assert.match(css, /scroll-snap-type:x proximity/);
});
test("v6.5 remains presentation-only with Alpha content, starter sizes and Ranked timer unchanged", () => {
    assert.match(server, /version: "6\.5\.0"/);
    assert.match(html, /v6\.5 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v6.5 tests passed.`);
