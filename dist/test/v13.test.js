import { alphaDefinitions } from "../src/cards.js";
import { activateAbility, activateResponse, advancePhase, createMatch, declareAttack, getCurrentPower, getLegalActions, mulligan, passPriority, playAction, playActionInteractive, playEmployee, playSystem, resolveChoice, resolveHandSelection, resolveTriggerTargetSelection, setIncident } from "../src/engine.js";
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
function assertThrows(fn, pattern, message) {
    let thrown = null;
    try {
        fn();
    }
    catch (error) {
        thrown = error;
    }
    assert(thrown instanceof Error && pattern.test(thrown.message), message);
}
const tests = [];
function test(name, fn) { tests.push([name, fn]); }
function match(p1, p2) {
    const state = createMatch({ matchId: "v13", seed: 1300, firstPlayerId: "P1", definitions: alphaDefinitions, p1Deck: p1, p2Deck: p2 });
    mulligan(state, "P1", []);
    mulligan(state, "P2", []);
    return state;
}
function toMain(state, playerId) {
    if (state.phase === "START")
        advancePhase(state, playerId);
    if (state.phase === "DRAW")
        advancePhase(state, playerId);
    assert(state.phase === "MAIN", "Expected Main Phase");
}
function forceToHand(state, playerId, definitionId) {
    const p = state.players[playerId];
    const existing = p.hand.find(id => state.cards[id].definitionId === definitionId);
    if (existing)
        return existing;
    const idx = p.deck.findIndex(id => state.cards[id].definitionId === definitionId);
    if (idx < 0)
        throw new Error(`No ${definitionId}`);
    const [id] = p.deck.splice(idx, 1);
    state.cards[id].zone = "HAND";
    state.cards[id].objectVersion += 1;
    p.hand.push(id);
    return id;
}
function forceEmployee(state, playerId, definitionId, slot) {
    const id = forceToHand(state, playerId, definitionId);
    state.players[playerId].hand = state.players[playerId].hand.filter(x => x !== id);
    const c = state.cards[id];
    c.zone = "EMPLOYEE_FIELD";
    c.slot = slot;
    c.faceUp = true;
    c.onboarding = false;
    c.controllerId = playerId;
    c.enteredFieldTurnNumber = 0;
    state.players[playerId].employeeField[slot] = id;
    return id;
}
function resolveCurrentTrigger(state, playerId, targets) {
    const sel = state.pendingTriggerTargetSelection;
    assert(sel && sel.playerId === playerId, "Expected trigger target selection");
    resolveTriggerTargetSelection(state, playerId, sel.id, targets);
    if (state.responseWindow) {
        const first = state.priorityPlayerId;
        passPriority(state, first);
        if (state.responseWindow)
            passPriority(state, state.priorityPlayerId);
    }
}
test("v1.3 baseline of at least 84 FULL cards is preserved", () => {
    const statuses = Object.values(alphaDefinitions).map(x => x.implementationStatus ?? "FULL");
    assert(statuses.filter(x => x === "FULL").length >= 84, "Expected at least 84 FULL cards");
});
test("Service Desk Lead pauses for a player-selected opposing target", () => {
    const state = match([{ definitionId: "IT-001", copies: 30 }, { definitionId: "IT-002", copies: 10 }], [{ definitionId: "CS-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const mat = forceToHand(state, "P1", "IT-001");
    playEmployee(state, "P1", mat, 0);
    const lead = forceToHand(state, "P1", "IT-002");
    playEmployee(state, "P1", lead, 0, [mat]);
    const enemy = forceEmployee(state, "P2", "CS-001", 0);
    const ticket = forceToHand(state, "P1", "IT-001");
    playEmployee(state, "P1", ticket, 1);
    assert(state.pendingTriggerTargetSelection?.playerId === "P1", "Lead should request target selection");
    assert(state.pendingTriggerTargetSelection.targetChoices[0].candidateIds.includes(enemy), "Enemy should be a legal target");
    resolveCurrentTrigger(state, "P1", { TARGET_1: [enemy] });
    assert(getCurrentPower(state, enemy) === 1, "Selected enemy should get -1 Power");
});
test("Office Manager target selector excludes itself", () => {
    const state = match([{ definitionId: "OFC-003", copies: 20 }, { definitionId: "N-010", copies: 20 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const manager = forceToHand(state, "P1", "OFC-003");
    playEmployee(state, "P1", manager, 0);
    const colleague = forceEmployee(state, "P1", "OFC-003", 1);
    const meeting = forceToHand(state, "P1", "N-010");
    // Quick Meeting is text-only and cannot be played; directly queue a Meeting by using a second Office Manager play is not tagged Meeting? It is.
    const secondMeetingCard = forceToHand(state, "P1", "OFC-003");
    playEmployee(state, "P1", secondMeetingCard, 2);
    const sel = state.pendingTriggerTargetSelection;
    assert(sel, "Expected Office Manager target selection");
    const candidates = sel.targetChoices[0].candidateIds;
    assert(!candidates.includes(manager), "Source Office Manager must be excluded");
    assert(candidates.includes(colleague), "Other Office Employee should be selectable");
});
test("Social Media Manager draws then pauses for one hand card to Archive", () => {
    const state = match([{ definitionId: "MKT-001", copies: 10 }, { definitionId: "MKT-009", copies: 30 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 40;
    const smm = forceToHand(state, "P1", "MKT-001");
    playEmployee(state, "P1", smm, 0);
    const a1 = forceToHand(state, "P1", "MKT-009");
    playAction(state, "P1", a1, { TARGET_1: [smm] });
    const beforeSecond = state.players.P1.hand.length;
    const a2 = forceToHand(state, "P1", "MKT-009");
    playAction(state, "P1", a2, { TARGET_1: [smm] });
    assert(state.pendingHandSelection?.playerId === "P1", "Second Marketing Action should request hand archive");
    assert(state.players.P1.hand.length >= beforeSecond, "Trigger should draw before requesting archive");
    const pick = state.pendingHandSelection.candidateIds[0];
    resolveHandSelection(state, "P1", state.pendingHandSelection.id, [pick]);
    assert(state.cards[pick].zone === "ARCHIVE", "Selected hand card should be Archived");
});
test("Follow-Up Email returns a Ticket Action but prevents replay that turn", () => {
    const state = match([{ definitionId: "CS-017", copies: 20 }, { definitionId: "CS-008", copies: 20 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const ticket = forceToHand(state, "P1", "CS-008");
    state.players.P1.hand = state.players.P1.hand.filter(x => x !== ticket);
    state.cards[ticket].zone = "ARCHIVE";
    state.players.P1.archive.push(ticket);
    const follow = forceToHand(state, "P1", "CS-017");
    playAction(state, "P1", follow, { TARGET_1: [ticket] });
    assert(state.cards[ticket].zone === "HAND", "Ticket should return to hand");
    assert(!getLegalActions(state, "P1").playableActions.some(x => x.cardId === ticket), "Returned Ticket must not be playable this turn");
    assertThrows(() => playAction(state, "P1", ticket, {}), /cannot be played this turn/, "Direct engine call must also enforce restriction");
});
test("Ticket Closed shuffles a Ticket Action into Deck and draws one", () => {
    const state = match([{ definitionId: "IT-009", copies: 20 }, { definitionId: "CS-008", copies: 20 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const target = forceToHand(state, "P1", "CS-008");
    state.players.P1.hand = state.players.P1.hand.filter(x => x !== target);
    state.cards[target].zone = "ARCHIVE";
    state.players.P1.archive.push(target);
    const tc = forceToHand(state, "P1", "IT-009");
    const before = state.players.P1.hand.length;
    playAction(state, "P1", tc, { TARGET_1: [target] });
    assert(state.cards[target].zone === "DECK", "Target Ticket Action should be in Deck");
    assert(!state.players.P1.archive.includes(target), "Target should leave Archive");
    assert(state.players.P1.hand.length === before, "Ticket Closed leaves hand and draw replaces it");
});
test("Staging Environment plays a cheap IT System through Deploy for one less", () => {
    const state = match([{ definitionId: "IT-020", copies: 10 }, { definitionId: "IT-019", copies: 15 }, { definitionId: "IT-014", copies: 15 }], [{ definitionId: "CS-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 20;
    const staging = forceToHand(state, "P1", "IT-020");
    playSystem(state, "P1", staging, 0);
    const backlogLike = forceToHand(state, "P1", "IT-019"); // IT-019 is an Action, so use another IT-020 as a 2-cost System.
    void backlogLike;
    const target = forceToHand(state, "P1", "IT-020");
    const before = state.players.P1.availableCapacity;
    activateAbility(state, "P1", staging, "IT-020-A1", { TARGET_1: [target] });
    assert(state.cards[target].zone === "SUPPORT_FIELD", "Target System should enter Support field");
    assert(state.cards[target].lastPlayMethod === "DEPLOY", "Play method should be DEPLOY");
    assert(state.players.P1.availableCapacity === before - 1, "Printed cost 2 should be reduced to 1");
});
test("Escalated Ticket can count as two Promotion materials", () => {
    const state = match([{ definitionId: "CS-009", copies: 10 }, { definitionId: "PRD-001", copies: 20 }, { definitionId: "PRD-008", copies: 10 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 40;
    const worker = forceToHand(state, "P1", "PRD-001");
    state.players.P1.hand = state.players.P1.hand.filter(x => x !== worker);
    state.cards[worker].zone = "ARCHIVE";
    state.players.P1.archive.push(worker);
    const escalated = forceToHand(state, "P1", "CS-009");
    playAction(state, "P1", escalated, { TARGET_1: [worker] });
    assert(state.cards[worker].zone === "EMPLOYEE_FIELD", "Worker should return to field");
    const boss = forceToHand(state, "P1", "PRD-008");
    const legal = getLegalActions(state, "P1").playableEmployees.find(x => x.cardId === boss);
    assert(legal?.options.some(o => o.promotionMaterialIds.length === 1 && o.promotionMaterialIds[0] === worker), "One doubled worker should be projected as enough for Promotion 2");
    playEmployee(state, "P1", boss, state.cards[worker].slot, [worker]);
    assert(state.cards[boss].zone === "EMPLOYEE_FIELD", "Plant Manager should be promoted using one doubled material");
});
test("Packaging Machine excludes the battle attacker from its target candidates", () => {
    const state = match([{ definitionId: "PRD-015", copies: 10 }, { definitionId: "PRD-001", copies: 30 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const machine = forceToHand(state, "P1", "PRD-015");
    playSystem(state, "P1", machine, 0);
    const attacker = forceEmployee(state, "P1", "PRD-001", 0);
    const other = forceEmployee(state, "P1", "PRD-001", 1);
    const defender = forceEmployee(state, "P2", "IT-001", 0);
    state.cards[attacker].powerModifiers.push({ id: "test", amount: 2, expiresAtTurnNumber: state.turnNumber });
    advancePhase(state, "P1");
    state.cards[attacker].onboarding = false;
    declareAttack(state, "P1", attacker, defender);
    const sel = state.pendingTriggerTargetSelection;
    assert(sel, "Packaging Machine should request a target");
    const candidates = sel.targetChoices[0].candidateIds;
    assert(!candidates.includes(attacker), "Battle attacker must be excluded");
    assert(candidates.includes(other), "Another Production Employee should be selectable");
});
test("trigger target selection is exposed through legal actions and blocks other commands", () => {
    const state = match([{ definitionId: "IT-001", copies: 30 }, { definitionId: "IT-002", copies: 10 }], [{ definitionId: "CS-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const mat = forceToHand(state, "P1", "IT-001");
    playEmployee(state, "P1", mat, 0);
    const lead = forceToHand(state, "P1", "IT-002");
    playEmployee(state, "P1", lead, 0, [mat]);
    forceEmployee(state, "P2", "CS-001", 0);
    const ticket = forceToHand(state, "P1", "IT-001");
    playEmployee(state, "P1", ticket, 1);
    const legal = getLegalActions(state, "P1");
    assert(legal.canResolveTriggerTargetSelection, "Owner should be allowed to resolve trigger targets");
    assert(!legal.canAdvancePhase && legal.playableEmployees.length === 0, "Other actions must be blocked while trigger target selection is pending");
});
test("Customer Satisfaction Survey lets its controller choose the Employee receiving the Review buff", () => {
    const state = match([{ definitionId: "CS-020", copies: 10 }, { definitionId: "CS-014", copies: 15 }, { definitionId: "CS-001", copies: 15 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    state.players.P1.reputation = 10;
    const survey = forceToHand(state, "P1", "CS-020");
    playSystem(state, "P1", survey, 0);
    const agent = forceToHand(state, "P1", "CS-001");
    playEmployee(state, "P1", agent, 0);
    const review = forceToHand(state, "P1", "CS-014");
    playAction(state, "P1", review);
    assert(state.pendingTriggerTargetSelection, "Review restore should create Survey target selection");
    resolveCurrentTrigger(state, "P1", { TARGET_1: [agent] });
    assert(getCurrentPower(state, agent) === 3, "Survey should give selected CS Employee +1 Power");
});
test("Operations Director draws after an opponent Action is delayed", () => {
    const state = match([{ definitionId: "OFC-006", copies: 10 }, { definitionId: "OFC-007", copies: 30 }], [{ definitionId: "MKT-012", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    forceEmployee(state, "P1", "OFC-006", 0);
    const approval = forceToHand(state, "P1", "OFC-007");
    setIncident(state, "P1", approval, 0);
    advancePhase(state, "P1");
    advancePhase(state, "P1");
    advancePhase(state, "P1");
    toMain(state, "P2");
    state.players.P2.availableCapacity = 30;
    const viral = forceToHand(state, "P2", "MKT-012");
    const before = state.players.P1.hand.length;
    playActionInteractive(state, "P2", viral);
    activateResponse(state, "P1", approval, "OFC-007-A1");
    passPriority(state, "P2");
    passPriority(state, "P1");
    assert(state.pendingChoice?.playerId === "P2", "Approval Required should ask P2 whether to pay or delay");
    resolveChoice(state, "P2", state.pendingChoice.id, "DELAY");
    // The Director's queued draw is itself a triggered Chain Item. Resolve it if a window is open.
    while (state.responseWindow && state.priorityPlayerId) {
        passPriority(state, state.priorityPlayerId);
    }
    assert(state.players.P1.hand.length === before + 1, "Operations Director should draw exactly one card after delay");
});
test("Campaign Dashboard turns the first Content Action into a top-two Campaign selection", () => {
    const state = match([{ definitionId: "MKT-015", copies: 5 }, { definitionId: "MKT-001", copies: 10 }, { definitionId: "MKT-009", copies: 10 }, { definitionId: "MKT-012", copies: 15 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(state, "P1");
    state.players.P1.availableCapacity = 30;
    const dashboard = forceToHand(state, "P1", "MKT-015");
    playSystem(state, "P1", dashboard, 0);
    const employee = forceEmployee(state, "P1", "MKT-001", 0);
    const content = forceToHand(state, "P1", "MKT-009");
    // Put a Campaign Action on top so it is definitely selectable.
    const campaign = forceToHand(state, "P1", "MKT-012");
    state.players.P1.hand = state.players.P1.hand.filter(id => id !== campaign);
    state.cards[campaign].zone = "DECK";
    state.players.P1.deck.push(campaign);
    playAction(state, "P1", content, { TARGET_1: [employee] });
    assert(state.pendingDeckSelection?.playerId === "P1", "Dashboard should create top-deck selection");
    assert(state.pendingDeckSelection.candidateIds.includes(campaign), "Campaign Action should be selectable");
});
let passed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        passed++;
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
}
console.log(`\nv1.3 interaction/selection tests: ${passed}/${tests.length} passed`);
