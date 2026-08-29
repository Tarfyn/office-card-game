import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { createMatch } from "../src/engine.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { projectStateForViewer } from "../src/projection.js";
import { runBalanceSeries } from "../src/balance.js";
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
test("client Chain projection exposes visible stack data without leaking opponent hand cards", () => {
    const state = createMatch({
        matchId: "v17-chain", seed: 17001, firstPlayerId: "P1", definitions: alphaDefinitions,
        p1Deck: alphaDeckPresets["customer-service-starter"].cards, p2Deck: alphaDeckPresets["it-starter"].cards, format: ALPHA_FORMAT
    });
    const p1Source = state.players.P1.hand[0];
    const p2Target = state.players.P2.hand[0];
    state.chain.push({
        id: "chain-1", sourceInstanceId: p1Source, sourceObjectVersion: state.cards[p1Source].objectVersion,
        controllerId: "P1", abilityId: "TEST-A1", effects: [], targets: { TARGET: [p2Target] }, targetObjectVersions: {},
        targetSelectors: [], negated: false, delayed: false, triggeringChainItemId: null, archiveSourceAfterResolve: false,
        effectsResolved: false, archiveWindowOffered: false, resolutionEventEmitted: false
    });
    const p1 = projectStateForViewer(state, "P1");
    const p2 = projectStateForViewer(state, "P2");
    assert.equal(p1.chainLength, 1);
    assert.equal(p1.chain[0].sourceId, p1Source);
    assert.deepEqual(p1.chain[0].targets.TARGET, [], "P1 must not receive the identity of a target in opponent hand");
    assert.equal(p2.chain[0].sourceId, null, "P2 must not receive the identity of a source that is still hidden in opponent hand");
    assert.equal(p2.chain[0].abilityId, undefined, "Ability id is hidden with an unknown source");
    assert.deepEqual(p2.chain[0].targets, {}, "Targets are hidden with an unknown source to avoid leaking effect shape");
});
test("v1.7 browser centers Chain/responses and compacts utility controls", () => {
    const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
    const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
    assert.match(app, /function renderChainStack/);
    assert.match(app, /function renderDecisionCenter/);
    assert.match(app, /data-card-ability/);
    assert.match(app, /Advanced controls/);
    assert.match(css, /\.chain-stack/);
    assert.match(css, /\.response-block/);
    assert.match(css, /\.deck-pile/);
    assert.match(css, /\.command-dock/);
});
test("v1.7 balance report includes behavior diagnostics per deck", () => {
    const report = runBalanceSeries({ gamesPerMatchup: 1, baseSeed: 17701, maxTurns: 18, maxSteps: 1200 });
    assert.match(report.engineVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(report.decks.length, 5);
    for (const deck of report.decks) {
        assert.equal(typeof deck.averageActionsResolved, "number");
        assert.equal(typeof deck.averageIncidentsActivated, "number");
        assert.equal(typeof deck.averageAttacksDeclared, "number");
        assert.equal(typeof deck.averageReputationRestored, "number");
    }
});
console.log(`${passed}/3 v1.7 tests passed.`);
