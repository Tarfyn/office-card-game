import { alphaDefinitions } from "./cards.js";
import { createMatch } from "./engine.js";
import { executeMatchIntent } from "./intents.js";
let state = createMatch({
    matchId: "intent-demo",
    seed: 20260825,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck: [{ definitionId: "CS-001", copies: 40 }],
    p2Deck: [{ definitionId: "IT-001", copies: 40 }]
});
let intentSeq = 0;
function send(playerId, intent) {
    intentSeq += 1;
    const result = executeMatchIntent(state, {
        intentId: `DEMO-${intentSeq}`,
        matchId: state.matchId,
        playerId,
        expectedStateVersion: state.stateVersion,
        intent
    });
    console.log(JSON.stringify({
        intent: intent.type,
        playerId,
        accepted: result.response.accepted,
        stateVersion: result.response.stateVersion,
        phase: result.response.view.phase,
        events: result.response.events.map((event) => event.type)
    }, null, 2));
    state = result.state;
}
send("P1", { type: "MULLIGAN", returnIds: [] });
send("P2", { type: "MULLIGAN", returnIds: [] });
send("P1", { type: "ADVANCE_PHASE" });
send("P1", { type: "ADVANCE_PHASE" });
const firstEmployee = state.players.P1.hand.find((id) => state.definitions[state.cards[id].definitionId].cardType === "EMPLOYEE");
if (firstEmployee)
    send("P1", { type: "PLAY_EMPLOYEE", cardId: firstEmployee, slot: 0 });
console.log("\nProjected legal actions for P1:");
console.log(JSON.stringify(executeMatchIntent(state, {
    intentId: "STALE-DEMO",
    matchId: state.matchId,
    playerId: "P1",
    expectedStateVersion: state.stateVersion - 1,
    intent: { type: "ADVANCE_PHASE" }
}).response, null, 2));
