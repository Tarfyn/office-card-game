import { strict as assert } from "node:assert";
import { createMatch, mulligan } from "../src/engine.js";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { autoAdvanceSafePhases, executeHostedMatchIntent } from "../src/intents.js";
import { RoomService } from "../src/room.js";
import type { GameState, MatchIntentCommand } from "../src/types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const en = root("public/locales/en.js");
const de = root("public/locales/de.js");

function setupActiveState(matchId: string): GameState {
  const state = createMatch({
    matchId,
    seed: 76930,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck: alphaDeckPresets["it-starter"].cards,
    p2Deck: alphaDeckPresets["it-starter"].cards,
    format: ALPHA_FORMAT
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  return state;
}

function command(state: GameState, playerId: "P1" | "P2", intent: MatchIntentCommand["intent"]): MatchIntentCommand {
  return { intentId: `${state.matchId}-${state.stateVersion}-${intent.type}`, matchId: state.matchId, playerId, expectedStateVersion: state.stateVersion, intent };
}

test("hosted normal turns auto-advance START and DRAW into MAIN", () => {
  const state = createMatch({ matchId:"AUTO-START-DRAW", seed:76930, firstPlayerId:"P1", definitions:alphaDefinitions, p1Deck:alphaDeckPresets["it-starter"].cards, p2Deck:alphaDeckPresets["it-starter"].cards, format:ALPHA_FORMAT });
  mulligan(state, "P1", []);
  const execution = executeHostedMatchIntent(state, command(state, "P2", { type:"MULLIGAN", returnIds:[] }));
  assert.equal(execution.response.accepted, true);
  assert.equal(execution.state.status, "ACTIVE");
  assert.equal(execution.state.phase, "MAIN");
  assert.ok(execution.response.events.some((event) => event.type === "PHASE_CHANGED"));
});

test("a pending choice blocks boundary auto-advance and resumes once resolved", () => {
  const state = setupActiveState("AUTO-CHOICE");
  state.pendingChoice = { id:"choice-1", playerId:"P1", chainItemId:"chain-1", sourceId:"card-1", controllerId:"P1", abilityId:"choose", triggeringChainItemId:null, targets:{}, targetObjectVersions:{}, options:[{ id:"one", effects:[] }] };
  assert.equal(autoAdvanceSafePhases(state), 0);
  assert.equal(state.phase, "START");
  state.pendingChoice = null;
  assert.equal(autoAdvanceSafePhases(state), 2);
  assert.equal(state.phase, "MAIN");
});

test("a response window blocks DRAW and duplicate runner calls make no progress", () => {
  const state = setupActiveState("AUTO-RESPONSE");
  state.phase = "DRAW";
  state.responseWindow = { event:"ATTACK_DECLARED", actorId:"P1", triggeringChainItemId:null };
  state.priorityPlayerId = "P1";
  assert.equal(autoAdvanceSafePhases(state), 0);
  assert.equal(state.phase, "DRAW");
  state.responseWindow = null;
  state.priorityPlayerId = null;
  assert.equal(autoAdvanceSafePhases(state), 1);
  assert.equal(state.phase, "MAIN");
  assert.equal(autoAdvanceSafePhases(state), 0);
});

test("the End-phase hand-limit gate pauses automatic turn handoff", () => {
  const state = setupActiveState("AUTO-HAND-LIMIT");
  state.phase = "END";
  state.players.P1.hand.push("overflow-a", "overflow-b", "overflow-c", "overflow-d");
  assert.equal(autoAdvanceSafePhases(state), 0);
  assert.equal(state.phase, "END");
  state.players.P1.hand.splice(8);
  assert.equal(autoAdvanceSafePhases(state), 3);
  assert.equal(state.activePlayerId, "P2");
  assert.equal(state.phase, "MAIN");
});

test("MAIN and BATTLE remain explicit, while explicit Battle completion hands off through END", () => {
  const main = setupActiveState("AUTO-MAIN");
  main.phase = "MAIN";
  assert.equal(autoAdvanceSafePhases(main), 0);
  const battle = setupActiveState("AUTO-BATTLE");
  battle.phase = "BATTLE";
  assert.equal(autoAdvanceSafePhases(battle), 0);
  const execution = executeHostedMatchIntent(battle, command(battle, "P1", { type:"ADVANCE_PHASE" }));
  assert.equal(execution.response.accepted, true);
  assert.equal(execution.state.activePlayerId, "P2");
  assert.equal(execution.state.phase, "MAIN");
});

test("Training bot turns use hosted boundary progression and remain reward-ineligible", () => {
  let token = 0;
  const service = new RoomService({ roomIdFactory:() => "AUTO-TRAINING", tokenFactory:() => `auto-${++token}`, seedFactory:() => 76930, firstPlayerFactory:() => "P1" });
  const room = service.createBotRoom("it-starter", { mode:"TRAINING" });
  const result = service.submitIntent(room.roomId, room.token, { intentId:"training-mulligan", expectedStateVersion:room.view.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  assert.equal(result.response.accepted, true);
  assert.equal(result.view.settings.mode, "TRAINING");
  assert.equal(result.view.settings.rewardEligible, false);
  assert.equal(result.view.match?.phase, "MAIN");
});

test("Tutorial can explicitly retain its instructional phase pauses", () => {
  const state = setupActiveState("AUTO-TUTORIAL");
  const execution = executeHostedMatchIntent(state, command(state, "P1", { type:"ADVANCE_PHASE" }), { autoAdvancePhases:false });
  assert.equal(execution.response.accepted, true);
  assert.equal(execution.state.phase, "DRAW");
});

test("phase divider exposes localized phase labels and a non-color turn-owner cue", () => {
  assert.match(app, /turn-owner-own/);
  assert.match(app, /turn-owner-opponent/);
  assert.match(app, /match\.yourTurn/);
  assert.match(app, /match\.opponentTurn/);
  assert.match(app, /phaseControlIsManual/);
  assert.match(en, /yourTurn: "YOUR TURN"/);
  assert.match(en, /opponentTurn: "OPPONENT TURN"/);
  assert.match(de, /yourTurn: "DEIN ZUG"/);
  assert.match(de, /opponentTurn: "GEGNERISCHER ZUG"/);
});

console.log(`\n${passed}/${passed} v7.69.32 phase-flow tests passed.`);
