import { alphaDefinitions } from "../src/cards.js";
import { activateResponse, advancePhase, createMatch, declareAttackInteractive, getAvailableResponses, getCurrentPower, getLegalActions, mulligan, passPriority, playAction, playActionInteractive, resolveDeckSelection } from "../src/engine.js";
import { projectStateForViewer } from "../src/projection.js";
function assert(condition, message) { if (!condition)
    throw new Error(message); }
function assertThrows(fn, pattern, message) { let e; try {
    fn();
}
catch (err) {
    e = err;
} assert(e instanceof Error && pattern.test(e.message), message); }
const tests = [];
const test = (n, f) => tests.push([n, f]);
function match(p1, p2, definitions = alphaDefinitions) {
    const state = createMatch({ matchId: "v14", seed: 1414, firstPlayerId: "P1", definitions, p1Deck: p1, p2Deck: p2 });
    mulligan(state, "P1", []);
    mulligan(state, "P2", []);
    return state;
}
function toMain(s, p) { s.activePlayerId = p; s.phase = "MAIN"; s.players[p].availableCapacity = 50; }
function forceToHand(s, p, d) { const pl = s.players[p]; const h = pl.hand.find(id => s.cards[id].definitionId === d); if (h)
    return h; const i = pl.deck.findIndex(id => s.cards[id].definitionId === d); if (i < 0)
    throw new Error(`No ${d}`); const [id] = pl.deck.splice(i, 1); s.cards[id].zone = "HAND"; s.cards[id].objectVersion++; pl.hand.push(id); return id; }
function forceEmployee(s, p, d, slot) { const id = forceToHand(s, p, d); s.players[p].hand = s.players[p].hand.filter(x => x !== id); const c = s.cards[id]; c.zone = "EMPLOYEE_FIELD"; c.slot = slot; c.faceUp = true; c.onboarding = false; c.controllerId = p; c.enteredFieldTurnNumber = 0; s.players[p].employeeField[slot] = id; return id; }
function forceSystem(s, p, d, slot) { const id = forceToHand(s, p, d); s.players[p].hand = s.players[p].hand.filter(x => x !== id); const c = s.cards[id]; c.zone = "SUPPORT_FIELD"; c.slot = slot; c.faceUp = true; c.controllerId = p; s.players[p].supportField[slot] = id; return id; }
function forceIncident(s, p, d, slot) { const id = forceToHand(s, p, d); s.players[p].hand = s.players[p].hand.filter(x => x !== id); const c = s.cards[id]; c.zone = "SUPPORT_FIELD"; c.slot = slot; c.faceUp = false; c.controllerId = p; c.setTurnNumber = 0; s.players[p].supportField[slot] = id; return id; }
function passTwice(s) { assert(s.priorityPlayerId, "Expected priority"); passPriority(s, s.priorityPlayerId); if (s.responseWindow && s.priorityPlayerId)
    passPriority(s, s.priorityPlayerId); }
test("v1.4 has full engine metadata for all 97 Alpha cards", () => { const defs = Object.values(alphaDefinitions); assert(defs.length >= 97, "Expected the original 97-card baseline to remain present"); assert(defs.every(d => (d.implementationStatus ?? "FULL") === "FULL"), "Every Alpha card should be FULL"); });
test("Escalation Specialist gets +1 only after an Incident was activated during the opponent's last turn", () => {
    const s = match([{ definitionId: "CS-004", copies: 40 }], [{ definitionId: "IT-001", copies: 40 }]);
    const id = forceEmployee(s, "P1", "CS-004", 0);
    s.phase = "BATTLE";
    s.previousTurnActivity = { activePlayerId: "P2", incidentsActivatedBy: { P1: 1 }, employeesDestroyedByOpponent: {} };
    assert(getCurrentPower(s, id) === 4, "Expected last-turn Incident bonus");
    s.previousTurnActivity = { activePlayerId: "P2", incidentsActivatedBy: {}, employeesDestroyedByOpponent: {} };
    assert(getCurrentPower(s, id) === 3, "Bonus should disappear without history");
});
test("I'd Like to Speak to Your Manager reduces the next CS Promotion from 2 materials to 1", () => {
    const s = match([{ definitionId: "CS-016", copies: 10 }, { definitionId: "CS-001", copies: 15 }, { definitionId: "CS-007", copies: 15 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    s.previousTurnActivity = { activePlayerId: "P2", incidentsActivatedBy: {}, employeesDestroyedByOpponent: { P1: 1 } };
    const staff = forceEmployee(s, "P1", "CS-001", 0);
    const action = forceToHand(s, "P1", "CS-016");
    playAction(s, "P1", action);
    assert(s.pendingDeckSelection, "Search should pause");
    const pick = s.pendingDeckSelection.candidateIds[0];
    resolveDeckSelection(s, "P1", s.pendingDeckSelection.id, [pick]);
    const boss = forceToHand(s, "P1", "CS-007");
    const legal = getLegalActions(s, "P1").playableEmployees.find(x => x.cardId === boss);
    assert(legal?.options.some(o => o.promotionMaterialIds.length === 1 && o.promotionMaterialIds[0] === staff), "One Staff should satisfy reduced Promotion 2");
});
test("Legacy ERP enforces a hard two-Action cap while active", () => {
    const s = match([{ definitionId: "IT-015", copies: 10 }, { definitionId: "IT-010", copies: 30 }, { definitionId: "IT-001", copies: 10 }], [{ definitionId: "CS-001", copies: 40 }]);
    toMain(s, "P1");
    forceSystem(s, "P1", "IT-015", 0);
    const target = forceEmployee(s, "P1", "IT-001", 0);
    for (let i = 0; i < 2; i++) {
        const a = forceToHand(s, "P1", "IT-010");
        playAction(s, "P1", a, { TARGET_1: [target] });
    }
    const third = forceToHand(s, "P1", "IT-010");
    assert(!getLegalActions(s, "P1").playableActions.some(x => x.cardId === third), "Third Action should not be projected");
    assertThrows(() => playAction(s, "P1", third, { TARGET_1: [target] }), /more than 2 Actions/, "Third Action must be rejected");
});
test("All Hands Meeting gives the selected bonus target +2 when a Lead is controlled", () => {
    const s = match([{ definitionId: "OFC-009", copies: 20 }, { definitionId: "OFC-005", copies: 10 }, { definitionId: "OFC-001", copies: 10 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const lead = forceEmployee(s, "P1", "OFC-005", 0);
    const staff = forceEmployee(s, "P1", "OFC-001", 1);
    const a = forceToHand(s, "P1", "OFC-009");
    playAction(s, "P1", a, { TARGETS: [lead, staff], BONUS: [staff] });
    assert(getCurrentPower(s, lead) === 5, "Lead should get +1");
    assert(getCurrentPower(s, staff) === 5, "Bonus target should get +2 from All Hands Meeting plus the Department Manager continuous bonus");
});
test("PR Manager reduces only the first opponent card-effect Reputation loss each turn", () => {
    const s = match([{ definitionId: "MKT-004", copies: 40 }], [{ definitionId: "MKT-012", copies: 40 }]);
    forceEmployee(s, "P1", "MKT-004", 0);
    toMain(s, "P2");
    let a = forceToHand(s, "P2", "MKT-012");
    playAction(s, "P2", a);
    assert(Number(s.players.P1.reputation) === 19, "First 2 damage should be reduced to 1");
    a = forceToHand(s, "P2", "MKT-012");
    playAction(s, "P2", a);
    assert(Number(s.players.P1.reputation) === 17, "Second loss should not be reduced");
});
test("Boost the Post adds one extra card-effect Reputation loss after direct damage", () => {
    const s = match([{ definitionId: "MKT-010", copies: 20 }, { definitionId: "MKT-001", copies: 20 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const emp = forceEmployee(s, "P1", "MKT-001", 0);
    const a = forceToHand(s, "P1", "MKT-010");
    playAction(s, "P1", a, { TARGET_1: [emp] });
    s.phase = "BATTLE";
    s.cards[emp].onboarding = false;
    declareAttackInteractive(s, "P1", emp, null);
    passTwice(s);
    assert(s.players.P2.reputation === 16, "3 direct battle damage + 1 rider expected");
});
test("Client Feedback replaces post-resolution Archive with return to hand and replay restriction", () => {
    const s = match([{ definitionId: "MKT-013", copies: 10 }, { definitionId: "MKT-009", copies: 15 }, { definitionId: "MKT-001", copies: 15 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const feedback = forceIncident(s, "P1", "MKT-013", 0);
    const emp = forceEmployee(s, "P1", "MKT-001", 0);
    const a = forceToHand(s, "P1", "MKT-009");
    playActionInteractive(s, "P1", a, { TARGET_1: [emp] });
    passTwice(s);
    assert(s.responseWindow?.event === "ACTION_WOULD_BE_ARCHIVED" && s.priorityPlayerId === "P1", "Expected Action archive response window");
    assert(getAvailableResponses(s, "P1").some(x => x.sourceId === feedback), "Client Feedback should be available");
    activateResponse(s, "P1", feedback, "MKT-013-A1");
    passTwice(s);
    assert(s.cards[a].zone === "HAND", "Marketing Action should return to hand");
    assert(!getLegalActions(s, "P1").playableActions.some(x => x.cardId === a), "Returned Action cannot be replayed this turn");
});
test("Temporary Worker draws when Overtime Archives it as a SHIFT effect", () => {
    const s = match([{ definitionId: "PRD-002", copies: 15 }, { definitionId: "PRD-011", copies: 25 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const w = forceEmployee(s, "P1", "PRD-002", 0);
    const overtime = forceToHand(s, "P1", "PRD-011");
    playAction(s, "P1", overtime, { WORKER: [w] });
    s.cards[w].attacksUsed = 2;
    const before = s.players.P1.hand.length;
    advancePhase(s, "P1");
    advancePhase(s, "P1");
    assert(s.cards[w].zone === "ARCHIVE", "Worker should be Archived at End");
    assert(s.players.P1.hand.length === before + 1, "Temporary Worker should draw 1");
});
test("Maintenance Technician Archives itself instead of a targeted Machine System", () => {
    const destroy = { id: "TEST-D", version: 1, name: "Destroy", cardType: "ACTION", department: "NEUTRAL", cost: { play: 1 }, abilities: [{ id: "TEST-D-A1", type: "ACTIVATED", timing: "OWN_MAIN_PHASE", targets: [{ id: "T", controller: "OPPONENT", zone: "SUPPORT_FIELD", cardType: "SYSTEM", min: 1, max: 1 }], effects: [{ type: "DESTROY_TARGET", target: "T", cause: "CARD_EFFECT" }] }] };
    const defs = { ...alphaDefinitions, "TEST-D": destroy };
    const s = match([{ definitionId: "PRD-006", copies: 20 }, { definitionId: "PRD-013", copies: 20 }], [{ definitionId: "TEST-D", copies: 40 }], defs);
    const tech = forceEmployee(s, "P1", "PRD-006", 0);
    const machine = forceSystem(s, "P1", "PRD-013", 0);
    toMain(s, "P2");
    const a = forceToHand(s, "P2", "TEST-D");
    playActionInteractive(s, "P2", a, { T: [machine] });
    assert(s.priorityPlayerId === "P1", "P1 should receive response priority");
    assert(getAvailableResponses(s, "P1").some(x => x.sourceId === tech), "Technician response should be available");
    activateResponse(s, "P1", tech, "PRD-006-A1", { TARGET_1: [machine] });
    passTwice(s);
    assert(s.cards[tech].zone === "ARCHIVE", "Technician should Archive itself");
    assert(s.cards[machine].zone === "SUPPORT_FIELD", "Machine System should survive");
});
test("Cover the Shift opens after battle destruction and free-plays a cost-1 Production Staff", () => {
    const s = match([{ definitionId: "PRD-012", copies: 10 }, { definitionId: "PRD-001", copies: 30 }], [{ definitionId: "IT-001", copies: 40 }]);
    const cover = forceIncident(s, "P1", "PRD-012", 0);
    const victim = forceEmployee(s, "P1", "PRD-001", 0);
    const replacement = forceToHand(s, "P1", "PRD-001");
    const attacker = forceEmployee(s, "P2", "IT-001", 0);
    s.activePlayerId = "P2";
    s.phase = "BATTLE";
    s.cards[attacker].onboarding = false;
    declareAttackInteractive(s, "P2", attacker, victim);
    passTwice(s);
    assert(s.responseWindow?.event === "BATTLE_EMPLOYEE_DESTROYED" && s.priorityPlayerId === "P1", "Expected post-battle response");
    activateResponse(s, "P1", cover, "PRD-012-A1", { REPLACEMENT: [replacement] });
    passTwice(s);
    assert(s.cards[replacement].zone === "EMPLOYEE_FIELD" && s.cards[replacement].onboarding, "Replacement should enter free in Onboarding");
});
test("Office Gossip reveals face-down Incidents to its controller until end of turn after hitting an Incident", () => {
    const s = match([{ definitionId: "N-008", copies: 40 }], [{ definitionId: "CS-010", copies: 40 }]);
    toMain(s, "P1");
    const hidden = forceIncident(s, "P2", "CS-010", 0);
    const revealed = forceToHand(s, "P2", "CS-010");
    // Make random hand choice deterministic by leaving only one card in the opponent hand.
    for (const id of [...s.players.P2.hand])
        if (id !== revealed) {
            s.players.P2.hand = s.players.P2.hand.filter(x => x !== id);
            s.cards[id].zone = "DECK";
            s.players.P2.deck.push(id);
        }
    const gossip = forceToHand(s, "P1", "N-008");
    playAction(s, "P1", gossip);
    const view = projectStateForViewer(s, "P1");
    assert(view.players.P2.supportField[0]?.definitionId === "CS-010", "P1 should temporarily see the face-down Incident identity");
    assert(s.cards[hidden].faceUp === false, "Reveal must not flip the Incident face-up on the server");
});
test("Quick Meeting buffs exactly one chosen Employee and prevents the other from attacking", () => {
    const s = match([{ definitionId: "N-010", copies: 20 }, { definitionId: "CS-001", copies: 20 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const a = forceEmployee(s, "P1", "CS-001", 0);
    const b = forceEmployee(s, "P1", "CS-001", 1);
    const meeting = forceToHand(s, "P1", "N-010");
    playAction(s, "P1", meeting, { TARGETS: [a, b], BOOST: [a] });
    assert(getCurrentPower(s, a) === 3 && getCurrentPower(s, b) === 2, "Only BOOST target gets +1");
    assert(s.cards[b].cannotAttackUntilTurnNumber === s.turnNumber, "Other target cannot attack this turn");
});
test("Interim Team Lead responds once per turn when your Action targets another own Employee", () => {
    const s = match([{ definitionId: "N-004", copies: 10 }, { definitionId: "N-005", copies: 15 }, { definitionId: "CS-001", copies: 15 }], [{ definitionId: "IT-001", copies: 40 }]);
    toMain(s, "P1");
    const lead = forceEmployee(s, "P1", "N-004", 0);
    const employee = forceEmployee(s, "P1", "CS-001", 1);
    const presentation = forceToHand(s, "P1", "N-005");
    playActionInteractive(s, "P1", presentation, { TARGET_1: [employee] });
    assert(s.priorityPlayerId === "P2", "Opponent should receive first response priority");
    passPriority(s, "P2");
    assert(getAvailableResponses(s, "P1").some(x => x.sourceId === lead), "Interim Team Lead should now be a legal response");
    activateResponse(s, "P1", lead, "N-004-A1", { TARGET_1: [employee] });
    passTwice(s);
    assert(getCurrentPower(s, employee) === 5, "Presentation +2 and Interim Team Lead +1 should stack on the 2-Power Employee");
});
let passed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        passed++;
        console.log(`✓ ${name}`);
    }
    catch (e) {
        console.error(`✗ ${name}`);
        throw e;
    }
}
console.log(`\nv1.4 completion/replacement tests: ${passed}/${tests.length} passed`);
