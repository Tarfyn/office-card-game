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
test("v5.9 adds one accessible global feedback surface with player-facing tones", () => {
    assert.match(html, /id="feedbackHost"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(app, /function showFeedback\(tone, title, detail/);
    assert.match(app, /function friendlyErrorFeedback\(error/);
    assert.match(css, /\.feedback-toast\.tone-success/);
    assert.match(css, /\.feedback-toast\.tone-error/);
});
test("v5.9 makes server intent submission visibly busy and prevents accidental double-send", () => {
    assert.match(app, /intentBusy: false/);
    assert.match(app, /if \(state\.intentBusy\).*Move already submitting/s);
    assert.match(app, /state\.intentBusy = true/);
    assert.match(app, /state\.intentBusy = false/);
    assert.match(app, /Submitting move…/);
    assert.match(app, /aria-busy=/);
    assert.match(css, /\.intent-submitting \[data-action\]/);
});
test("v5.9 gives accepted moves and reconnect recovery concise feedback", () => {
    assert.match(app, /function acceptedIntentFeedback\(intent\)/);
    assert.match(app, /Employee played/);
    assert.match(app, /Attack declared/);
    assert.match(app, /Back online/);
    assert.match(app, /Authoritative match state synchronized/);
    assert.match(app, /Live updates interrupted/);
});
test("v5.9 improves Card Inspector keyboard focus lifecycle", () => {
    assert.match(app, /returnFocusCardRef/);
    assert.match(app, /CSS\.escape\(returnRef\)/);
    assert.match(app, /event\.key === 'Tab'/);
    assert.match(app, /button:not\(:disabled\),\[href\],input:not\(:disabled\),select:not\(:disabled\)/);
    assert.match(app, /event\.shiftKey && document\.activeElement === first/);
    assert.match(app, /document\.activeElement === last/);
});
test("v5.9 strengthens keyboard, touch and reduced-motion accessibility without replacing controls", () => {
    assert.match(html, /class="skip-link"/);
    assert.match(css, /button:focus-visible/);
    assert.match(css, /@media \(hover:none\) and \(pointer:coarse\)/);
    assert.match(css, /min-height:42px/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(app, /data-play-hand/);
    assert.match(app, /data-attack-source/);
});
test("v5.9 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
    assert.match(server, /version: "5\.9\.0"/);
    assert.match(html, /v5\.9 Alpha Playtest/i);
    assert.equal(settings.timerProfiles.find((profile) => profile.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.ok(cards.length >= 97);
    assert.equal(cards.filter((card) => Boolean(card.flavorText)).length, cards.length);
    assert.equal(decks.length, 5);
    for (const deck of decks)
        assert.equal(deck.cards.reduce((sum, entry) => sum + entry.copies, 0), 40);
});
console.log(`${passed}/6 v5.9 tests passed.`);
