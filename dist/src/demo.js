import { alphaDefinitions } from "./cards.js";
import { advancePhase, createMatch, declareAttack, findInHandByDefinition, getCardName, mulligan, playEmployee } from "./engine.js";
const filler = (definitionId, copies) => ({ definitionId, copies });
const state = createMatch({
    matchId: "demo-001",
    seed: 42,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck: [filler("CS-001", 20), filler("PRD-001", 20)],
    p2Deck: [filler("IT-001", 20), filler("PRD-004", 20)]
});
mulligan(state, "P1", []);
mulligan(state, "P2", []);
advancePhase(state, "P1"); // DRAW, skipped
advancePhase(state, "P1"); // MAIN
const p1Employee = findInHandByDefinition(state, "P1", "CS-001") ?? state.players.P1.hand[0];
playEmployee(state, "P1", p1Employee, 0);
advancePhase(state, "P1"); // BATTLE
advancePhase(state, "P1"); // END
advancePhase(state, "P1"); // P2 START
advancePhase(state, "P2"); // DRAW
advancePhase(state, "P2"); // MAIN
const p2Employee = findInHandByDefinition(state, "P2", "IT-001") ?? state.players.P2.hand[0];
playEmployee(state, "P2", p2Employee, 0);
advancePhase(state, "P2");
advancePhase(state, "P2");
advancePhase(state, "P2");
advancePhase(state, "P1"); // DRAW
advancePhase(state, "P1"); // MAIN
advancePhase(state, "P1"); // BATTLE
declareAttack(state, "P1", p1Employee, p2Employee);
console.log(`After battle: ${getCardName(state, p1Employee)} vs ${getCardName(state, p2Employee)}`);
console.log(`P1 Reputation: ${state.players.P1.reputation}`);
console.log(`P2 Reputation: ${state.players.P2.reputation}`);
console.log(`Events logged: ${state.eventLog.length}`);
console.log(state.eventLog.slice(-8));
