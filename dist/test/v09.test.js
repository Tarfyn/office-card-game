import { alphaDefinitions } from "../src/cards.js";
import { advancePhase, createMatch, mulligan, playEmployee, playSystem } from "../src/engine.js";
import { executeMatchIntent } from "../src/intents.js";
import { projectStateForViewer } from "../src/projection.js";
import { restoreMatchSnapshot, serializeMatchSnapshot } from "../src/snapshot.js";
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
const tests = [];
function test(name, fn) { tests.push([name, fn]); }
function deck(definitionId) { return [{ definitionId, copies: 40 }]; }
function createBasic(definitions = alphaDefinitions, p1 = "CS-001", p2 = "IT-001") {
    return createMatch({
        matchId: "v09-test",
        seed: 909,
        firstPlayerId: "P1",
        definitions,
        p1Deck: deck(p1),
        p2Deck: deck(p2)
    });
}
function readyMatch(definitions = alphaDefinitions, p1 = "CS-001", p2 = "IT-001") {
    const state = createBasic(definitions, p1, p2);
    mulligan(state, "P1", []);
    mulligan(state, "P2", []);
    return state;
}
function toMain(state, playerId) {
    while (state.activePlayerId === playerId && state.phase !== "MAIN")
        advancePhase(state, playerId);
    assert(state.activePlayerId === playerId && state.phase === "MAIN", "Expected Main Phase");
}
function forceToHand(state, playerId, definitionId) {
    const existing = state.players[playerId].hand.find((id) => state.cards[id].definitionId === definitionId);
    if (existing)
        return existing;
    const fromDeck = state.players[playerId].deck.find((id) => state.cards[id].definitionId === definitionId);
    assert(fromDeck, `No ${definitionId} available in deck`);
    state.players[playerId].deck = state.players[playerId].deck.filter((id) => id !== fromDeck);
    state.players[playerId].hand.push(fromDeck);
    state.cards[fromDeck].zone = "HAND";
    state.cards[fromDeck].objectVersion += 1;
    return fromDeck;
}
function command(state, playerId, intent, intentId = "intent") {
    return { intentId, matchId: state.matchId, playerId, expectedStateVersion: state.stateVersion, intent };
}
test("legal choice projection enumerates exact Promotion materials and destination slots", () => {
    const definitions = { ...alphaDefinitions };
    const state = readyMatch(definitions, "PRD-001", "IT-001");
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const w1 = forceToHand(state, "P1", "PRD-001");
    playEmployee(state, "P1", w1, 0);
    const w2 = forceToHand(state, "P1", "PRD-001");
    playEmployee(state, "P1", w2, 1);
    const managerDefinition = definitions["PRD-008"];
    assert(managerDefinition, "Plant Manager definition missing");
    const managerId = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.definitionId === "PRD-001" && card.zone === "DECK")?.instanceId;
    assert(managerId, "Need a card instance to repurpose for Plant Manager in test");
    state.definitions = { ...definitions, "TEST-MANAGER": { ...managerDefinition, id: "TEST-MANAGER", version: 1 } };
    state.cards[managerId].definitionId = "TEST-MANAGER";
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== managerId);
    state.players.P1.hand.push(managerId);
    state.cards[managerId].zone = "HAND";
    state.cards[managerId].objectVersion += 1;
    const view = projectStateForViewer(state, "P1");
    const option = view.legalActions.playableEmployees.find((entry) => entry.cardId === managerId);
    assert(option, "Plant Manager should be projected as playable");
    assert(option.options.length === 5, "Two materials should allow all five Employee destination slots after Promotion");
    for (const play of option.options) {
        assert(play.promotionMaterialIds.length === 2 && play.promotionMaterialIds.includes(w1) && play.promotionMaterialIds.includes(w2), "Every option should show the exact two legal Promotion materials");
    }
});
test("targeted Actions project exact legal target candidates", () => {
    const definitions = { ...alphaDefinitions };
    const state = readyMatch(definitions, "CS-001", "IT-001");
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const actionSource = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.zone === "DECK");
    actionSource.definitionId = "N-006";
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== actionSource.instanceId);
    state.players.P1.hand.push(actionSource.instanceId);
    actionSource.zone = "HAND";
    actionSource.objectVersion += 1;
    const opponent = forceToHand(state, "P2", "IT-001");
    state.players.P2.availableCapacity = 20;
    // Direct setup is sufficient for legal-choice projection.
    state.players.P2.hand = state.players.P2.hand.filter((id) => id !== opponent);
    state.players.P2.employeeField[0] = opponent;
    state.cards[opponent].zone = "EMPLOYEE_FIELD";
    state.cards[opponent].slot = 0;
    state.cards[opponent].faceUp = true;
    state.cards[opponent].onboarding = false;
    const view = projectStateForViewer(state, "P1");
    const action = view.legalActions.playableActions.find((entry) => entry.cardId === actionSource.instanceId);
    assert(action, "Forgot My Lunch should be playable with an opposing Employee");
    assert(action.targetChoices.length === 1, "Expected one target selector");
    assert(action.targetChoices[0].candidateIds.length === 1 && action.targetChoices[0].candidateIds[0] === opponent, "Projection should expose the exact legal Employee target");
});
test("face-down opponent Support targets use opaque client refs that resolve server-side", () => {
    const testAction = {
        id: "TEST-HIDDEN-DESTROY",
        version: 1,
        name: "Hidden Support Destroyer",
        cardType: "ACTION",
        department: "NEUTRAL",
        cost: { play: 1 },
        abilities: [{
                id: "TEST-HIDDEN-DESTROY-A1",
                type: "ACTIVATED",
                timing: "OWN_MAIN_PHASE",
                targets: [{ id: "TARGET_1", controller: "OPPONENT", zone: "SUPPORT_FIELD", min: 1, max: 1 }],
                effects: [{ type: "DESTROY_TARGET", target: "TARGET_1", cause: "CARD_EFFECT" }]
            }]
    };
    const definitions = { ...alphaDefinitions, [testAction.id]: testAction };
    const state = readyMatch(definitions, "CS-001", "IT-001");
    toMain(state, "P1");
    // Prepare opponent face-down Incident directly; legality/identity projection is what this test targets.
    const hidden = Object.values(state.cards).find((card) => card.ownerId === "P2" && card.zone === "DECK");
    hidden.definitionId = "IT-012";
    state.players.P2.deck = state.players.P2.deck.filter((id) => id !== hidden.instanceId);
    state.players.P2.supportField[0] = hidden.instanceId;
    hidden.zone = "SUPPORT_FIELD";
    hidden.slot = 0;
    hidden.faceUp = false;
    hidden.setTurnNumber = 0;
    hidden.objectVersion += 1;
    const action = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.zone === "DECK");
    action.definitionId = testAction.id;
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== action.instanceId);
    state.players.P1.hand.push(action.instanceId);
    action.zone = "HAND";
    action.objectVersion += 1;
    state.players.P1.availableCapacity = 20;
    const view = projectStateForViewer(state, "P1");
    const legal = view.legalActions.playableActions.find((entry) => entry.cardId === action.instanceId);
    const opaque = legal.targetChoices[0].candidateIds[0];
    assert(opaque.startsWith("hidden-support:P2:0:"), "Face-down target should use an opaque Support handle");
    assert(opaque !== hidden.instanceId, "Projection must not leak the real face-down instance id");
    const result = executeMatchIntent(state, command(state, "P1", { type: "PLAY_ACTION", cardId: action.instanceId, targets: { TARGET_1: [opaque] } }));
    assert(result.response.accepted, `Intent using opaque target should be accepted: ${result.response.error?.message ?? ""}`);
    assert(result.state.chain[0]?.targets.TARGET_1?.[0] === hidden.instanceId, "Server should resolve opaque target to the real internal card id");
});
test("Match Intent API increments stateVersion and rejects stale commands without mutation", () => {
    let state = createBasic();
    const first = executeMatchIntent(state, command(state, "P1", { type: "MULLIGAN", returnIds: [] }, "m1"));
    assert(first.response.accepted && first.state.stateVersion === 1, "Accepted intent should increment stateVersion");
    state = first.state;
    const before = JSON.stringify(state);
    const stale = { intentId: "stale", matchId: state.matchId, playerId: "P2", expectedStateVersion: 0, intent: { type: "MULLIGAN", returnIds: [] } };
    const staleResult = executeMatchIntent(state, stale);
    assert(!staleResult.response.accepted && staleResult.response.error?.code === "STALE_STATE", "Old version should be rejected as stale");
    assert(JSON.stringify(staleResult.state) === before, "Rejected stale intent must not mutate authoritative state");
});
test("illegal Match Intents are transactional", () => {
    let state = createBasic();
    state = executeMatchIntent(state, command(state, "P1", { type: "MULLIGAN", returnIds: [] }, "m1")).state;
    state = executeMatchIntent(state, command(state, "P2", { type: "MULLIGAN", returnIds: [] }, "m2")).state;
    state = executeMatchIntent(state, command(state, "P1", { type: "ADVANCE_PHASE" }, "p1")).state;
    state = executeMatchIntent(state, command(state, "P1", { type: "ADVANCE_PHASE" }, "p2")).state;
    assert(state.phase === "MAIN", "Expected Main Phase");
    const before = JSON.stringify(state);
    const rejected = executeMatchIntent(state, command(state, "P1", { type: "PLAY_EMPLOYEE", cardId: "NOT-A-CARD", slot: 0 }, "bad"));
    assert(!rejected.response.accepted && rejected.response.error?.code === "RULES_ERROR", "Illegal play should be rejected as RulesError");
    assert(JSON.stringify(rejected.state) === before, "Rejected Rules intent must leave state byte-for-byte unchanged");
});
test("PLAY_ACTION intent opens an interactive Chain and PASS_PRIORITY resolves it", () => {
    const definitions = { ...alphaDefinitions };
    let state = readyMatch(definitions, "CS-001", "IT-001");
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const action = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.zone === "DECK");
    action.definitionId = "MKT-012";
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== action.instanceId);
    state.players.P1.hand.push(action.instanceId);
    action.zone = "HAND";
    action.objectVersion += 1;
    let result = executeMatchIntent(state, command(state, "P1", { type: "PLAY_ACTION", cardId: action.instanceId }, "a1"));
    assert(result.response.accepted && result.state.chain.length === 1 && result.state.priorityPlayerId === "P2", "Action Intent should open a response window");
    state = result.state;
    result = executeMatchIntent(state, command(state, "P2", { type: "PASS_PRIORITY" }, "pass1"));
    state = result.state;
    result = executeMatchIntent(state, command(state, "P1", { type: "PASS_PRIORITY" }, "pass2"));
    assert(result.response.accepted && result.state.chain.length === 0, "Two passes should resolve and close the Chain");
    assert(result.state.players.P2.reputation === 18, "Going Viral should resolve for 2 Reputation when not third Marketing Action");
});
test("ACTIVATE_ABILITY intent puts face-up activated abilities onto the Chain", () => {
    let state = readyMatch(alphaDefinitions, "IT-001", "CS-001");
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const employee = forceToHand(state, "P1", "IT-001");
    playEmployee(state, "P1", employee, 0);
    const systemCard = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.zone === "DECK");
    systemCard.definitionId = "IT-014";
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== systemCard.instanceId);
    state.players.P1.hand.push(systemCard.instanceId);
    systemCard.zone = "HAND";
    systemCard.objectVersion += 1;
    playSystem(state, "P1", systemCard.instanceId, 0);
    const capacityBefore = state.players.P1.availableCapacity;
    const result = executeMatchIntent(state, command(state, "P1", { type: "ACTIVATE_ABILITY", sourceId: systemCard.instanceId, abilityId: "IT-014-A1" }, "ability"));
    assert(result.response.accepted && result.state.chain.length === 1, "Activated ability should become a Chain Item");
    assert(result.state.players.P1.availableCapacity === capacityBefore, "Ability effect should not resolve before the response window closes");
});
test("snapshot serialization restores a complete resumable match state", () => {
    const state = readyMatch();
    toMain(state, "P1");
    state.stateVersion = 12;
    const serialized = serializeMatchSnapshot(state);
    const restored = restoreMatchSnapshot(serialized);
    assert(JSON.stringify(restored) === JSON.stringify(state), "Restored snapshot should exactly reproduce serialized state");
    const result = executeMatchIntent(restored, command(restored, "P1", { type: "ADVANCE_PHASE" }, "resume"));
    assert(result.response.accepted && result.state.phase === "BATTLE" && result.state.stateVersion === 13, "Restored state should continue accepting versioned intents");
});
test("legal Support play projection enumerates free destination slots", () => {
    const state = readyMatch(alphaDefinitions, "IT-001", "CS-001");
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const systemCard = Object.values(state.cards).find((card) => card.ownerId === "P1" && card.zone === "DECK");
    systemCard.definitionId = "IT-014";
    state.players.P1.deck = state.players.P1.deck.filter((id) => id !== systemCard.instanceId);
    state.players.P1.hand.push(systemCard.instanceId);
    systemCard.zone = "HAND";
    systemCard.objectVersion += 1;
    const view = projectStateForViewer(state, "P1");
    const option = view.legalActions.playableSystems.find((entry) => entry.cardId === systemCard.instanceId);
    assert(option && JSON.stringify(option.slots) === JSON.stringify([0, 1, 2, 3]), "System play should expose all four free Support slots");
});
test("RESIGN intent ends the match in favor of the opponent", () => {
    const state = readyMatch();
    const result = executeMatchIntent(state, command(state, "P1", { type: "RESIGN" }, "resign"));
    assert(result.response.accepted && result.state.status === "ENDED" && result.state.winnerId === "P2", "Resign should immediately award the opponent the match");
});
let passed = 0;
for (const [name, fn] of tests) {
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
console.log(`\n${passed}/${tests.length} v0.9 tests passed.`);
