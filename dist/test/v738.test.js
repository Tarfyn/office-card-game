import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { analyzeContentGaps } from "../src/content-audit.js";
import { advancePhase, createMatch, findInHandByDefinition, getCardCost, getCurrentPower, mulligan, playAction, playEmployee, playSystem } from "../src/engine.js";
let passed = 0;
function test(n, f) { try {
    f();
    passed++;
    console.log(`✓ ${n}`);
}
catch (e) {
    console.error(`✗ ${n}`);
    throw e;
} }
const newIds = ["CS-021", "CS-022", "IT-021", "OFC-016", "OFC-017", "MKT-016", "MKT-017", "PRD-016", "PRD-017", "N-015"];
test("v7.38 expands the Alpha pool from 97 to exactly 107 definitions", () => {
    assert.equal(Object.keys(alphaDefinitions).length, 107);
    for (const id of newIds)
        assert.ok(alphaDefinitions[id], `${id} missing`);
    const expected = { CUSTOMER_SERVICE: 22, IT: 20, OFFICE: 17, MARKETING: 17, PRODUCTION: 17, NEUTRAL: 14 };
    for (const [department, count] of Object.entries(expected))
        assert.equal(Object.values(alphaDefinitions).filter(c => c.department === department).length, count);
});
test("v7.38 Expansion I cards are full, flavored and use existing card/effect vocabulary", () => {
    const allowedEffects = new Set(["DRAW", "LOOK_AT_TOP_SELECT", "MODIFY_POWER", "IF", "MOVE_TARGET", "RESTRICT_PLAY_TARGET", "MODIFY_COST"]);
    for (const id of newIds) {
        const card = alphaDefinitions[id];
        assert.equal(card.implementationStatus, "FULL");
        assert.ok(card.flavorText);
        for (const ability of card.abilities ?? [])
            for (const effect of ability.effects ?? []) {
                assert.ok(allowedEffects.has(effect.type), `${id} introduced ${effect.type}`);
                if (effect.type === "IF")
                    for (const nested of effect.then)
                        assert.ok(allowedEffects.has(nested.type), `${id} introduced nested ${nested.type}`);
            }
    }
});
test("v7.38 resolves the targeted early-body and reactive-depth audit gaps", () => {
    const audit = analyzeContentGaps();
    for (const dep of ["CUSTOMER_SERVICE", "OFFICE"])
        assert.equal(audit.gaps.some(g => g.department === dep && g.kind === "EARLY_EMPLOYEE_VARIETY"), false);
    for (const dep of ["MARKETING", "PRODUCTION"])
        assert.equal(audit.gaps.some(g => g.department === dep && g.kind === "REACTIVE_DEPTH"), false);
    assert.ok(audit.gaps.some(g => g.department === "MARKETING" && g.kind === "EARLY_EMPLOYEE_VARIETY"));
});
test("v7.38 leaves all five tuned starters unchanged and legal at 40 cards", () => {
    for (const deck of Object.values(alphaDeckPresets)) {
        assert.equal(deck.cards.reduce((sum, e) => sum + e.copies, 0), 40);
        assert.equal(deck.cards.some(e => newIds.includes(e.definitionId)), false);
    }
});
test("v7.38 ships the documented ten-card Expansion I contract", () => {
    const doc = readFileSync(fileURLToPath(new URL("../../EXPANSION_I_v7.38.md", import.meta.url)), "utf8");
    assert.match(doc, /97 → 107/);
    assert.match(doc, /No starter deck changes/i);
    assert.match(doc, /No new effect type/i);
    for (const id of newIds)
        assert.match(doc, new RegExp(id));
});
test("v7.38 Triage Agent and Warm Transfer execute through existing Power rules", () => {
    const state = createMatch({ matchId: "v738-cs", seed: 1, firstPlayerId: "P1", definitions: alphaDefinitions, p1Deck: [{ definitionId: "CS-021", copies: 20 }, { definitionId: "CS-022", copies: 20 }], p2Deck: [{ definitionId: "IT-001", copies: 40 }] });
    mulligan(state, "P1", []);
    mulligan(state, "P2", []);
    advancePhase(state, "P1");
    advancePhase(state, "P1");
    const agent = findInHandByDefinition(state, "P1", "CS-021");
    const transfer = findInHandByDefinition(state, "P1", "CS-022");
    playEmployee(state, "P1", agent, 0);
    playAction(state, "P1", transfer, { TARGET_1: [agent] });
    assert.equal(getCurrentPower(state, agent), 3);
});
test("v7.38 Shared Inbox uses the existing first-card cost modifier pipeline", () => {
    const state = createMatch({ matchId: "v738-neutral", seed: 1, firstPlayerId: "P1", definitions: alphaDefinitions, p1Deck: [{ definitionId: "N-015", copies: 20 }, { definitionId: "MKT-011", copies: 20 }], p2Deck: [{ definitionId: "IT-001", copies: 40 }] });
    mulligan(state, "P1", []);
    mulligan(state, "P2", []);
    advancePhase(state, "P1");
    advancePhase(state, "P1");
    const inbox = findInHandByDefinition(state, "P1", "N-015");
    const email = findInHandByDefinition(state, "P1", "MKT-011");
    playSystem(state, "P1", inbox, 0);
    const cost = getCardCost(state, "P1", email, "PLAY");
    assert.equal(cost.printedCost, 2);
    assert.equal(cost.finalCost, 1);
});
test("v7.38 compatibility marker remains after later versions", () => {
    const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
    assert.match(html, /Regression compatibility marker: v7\.38 Alpha Playtest/i);
});
console.log(`${passed}/8 v7.38 tests passed.`);
