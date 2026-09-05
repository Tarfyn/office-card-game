import { strict as assert } from "node:assert";
import { createMatch, mulligan } from "../src/engine.js";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { RoomService } from "../src/room.js";
import type { MatchIntent } from "../src/types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const styles = root("public/styles.css");
const app = root("public/app.js");
const packageJson = JSON.parse(root("package.json"));

test("v7.69.44 release version is current", () => {
assert.equal(packageJson.version, "7.69.58");
});

function service(firstPlayerId: "P1" | "P2" = "P1"): RoomService {
  let roomNumber = 0;
  let tokenNumber = 0;
  return new RoomService({
    roomIdFactory: () => `TUTORIAL-${++roomNumber}`,
    tokenFactory: () => `token-${++tokenNumber}`,
    seedFactory: () => 76928,
    firstPlayerFactory: () => firstPlayerId,
    nowFactory: (() => { let now = 1000; return () => ++now; })()
  });
}

function createBotRoom(mode: "TRAINING" | "TUTORIAL") {
  const roomService = service();
  return { roomService, room: roomService.createBotRoom("it-starter", { mode }) };
}

test("desktop Tutorial guidance does not consume the arena grid row", () => {
  assert.match(styles, /@media \(min-width:761px\) \{\s*\.tutorial-guide \{[\s\S]*?position:absolute;[\s\S]*?pointer-events:none;/);
  assert.match(app, /function renderTutorialGuide\(match\)/);
  assert.match(app, /function requestPhaseAdvance\(match\)/);
});

test("Tutorial starts with explicit metadata and reward exclusion", () => {
  const { room: created } = createBotRoom("TUTORIAL");
  assert.equal(created.view.settings.mode, "TUTORIAL");
  assert.equal(created.view.settings.bot, true);
  assert.equal(created.view.settings.rewardEligible, false);
  assert.equal(created.view.match?.phase, "MULLIGAN");
  const opening = created.view.match?.players?.P1?.hand?.map((card) => card.definitionId);
  assert.deepEqual(opening, ["N-001", "N-002", "CS-010", "IT-005", "IT-003"], "Tutorial opening hand must be fixed and teaching-safe");
  assert.equal(created.view.match?.firstPlayerId, "P2", "Coach opens so the player receives a deterministic Employee target");
  assert.match(root("server/server.mjs"), /fixedFirstPlayerId:"P2"/);
  assert.match(root("server/server.mjs"), /forceDrawDefinitionIds:\["IT-014"\]/);
  assert.match(root("server/server.mjs"), /forceOpponentOpeningDefinitionIds:\["N-001", "N-001"\]/);
  assert.match(root("public/tutorial-script.js"), /opening-hand/);
  assert.match(root("public/tutorial-script.js"), /direct-attack/);
  assert.match(root("public/tutorial-script.js"), /response-setup/);
  assert.match(root("public/app.js"), /state\.view\?\.settings\?\.mode === 'TUTORIAL'/);
  assert.match(root("public/app.js"), /t\(`tutorial\.\$\{step\.labelKey\}`\)/);
});

test("Keep then Continue reaches authoritative Draw and guided Main exactly once", () => {
  const { roomService, room } = createBotRoom("TUTORIAL");
  const kept = roomServiceSubmit(roomService, room, { type: "MULLIGAN", returnIds: [] }, room.view.match!.stateVersion);
  assert.equal(kept.response.accepted, true);
  assert.equal(kept.view.match?.phase, "START");
  assert.equal(kept.view.match?.players?.P2?.employeeField?.[0]?.definitionId, "N-001", "Coach leaves the teaching Employee in play");

  const draw = roomServiceSubmit(roomService, room, { type: "ADVANCE_PHASE" }, kept.view.match!.stateVersion, "tutorial-draw");
  assert.equal(draw.response.accepted, true);
  assert.equal(draw.view.match?.phase, "DRAW");
  assert.equal(draw.response.events.filter((event) => event.type === "PHASE_CHANGED").length, 1);

  const replay = roomServiceSubmit(roomService, room, { type: "ADVANCE_PHASE" }, kept.view.match!.stateVersion, "tutorial-draw");
  assert.equal(replay.replayed, true);
  assert.equal(replay.view.match?.phase, "DRAW");

  const duplicate = roomServiceSubmit(roomService, room, { type: "ADVANCE_PHASE" }, kept.view.match!.stateVersion, "tutorial-draw-duplicate");
  assert.equal(duplicate.response.accepted, false);
  assert.equal(duplicate.view.match?.phase, "DRAW");

  const main = roomServiceSubmit(roomService, room, { type: "ADVANCE_PHASE" }, draw.view.match!.stateVersion, "tutorial-main-after-draw");
  assert.equal(main.response.accepted, true);
  assert.equal(main.view.match?.phase, "MAIN");
  assert.ok(main.view.match?.players.P1.hand.some((card) => card.definitionId === "IT-014"), "Tutorial draw must use the fixed teaching card.");
});

test("normal PvP and Training mulligan transitions remain engine-authoritative", () => {
  const base = createMatch({
    matchId: "mulligan-regression",
    seed: 76928,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck: alphaDeckPresets["it-starter"].cards,
    p2Deck: alphaDeckPresets["it-starter"].cards,
    format: ALPHA_FORMAT
  });
  mulligan(base, "P1", []);
  assert.equal(base.phase, "MULLIGAN");
  assert.equal(base.status, "SETUP");
  mulligan(base, "P2", []);
  assert.equal(base.phase, "START");

  const { room: training } = createBotRoom("TRAINING");
  assert.equal(training.view.settings.mode, "TRAINING");
  assert.equal(training.view.settings.rewardEligible, false);
  assert.equal(training.view.match?.phase, "MULLIGAN");
});

test("deterministic Tutorial completes the support, combat, direct-attack and response lessons", () => {
  const { roomService, room } = createBotRoom("TUTORIAL");
  let view = room.view;
  const submit = (intent: MatchIntent) => {
    const result = roomServiceSubmit(roomService, room, intent, view.match!.stateVersion, `tutorial-full-${view.match!.stateVersion}-${intent.type}`);
    assert.equal(result.response.accepted, true, result.response.error?.message ?? `Tutorial intent ${intent.type} was rejected.`);
    view = result.view;
    return view.match!;
  };

  let match = submit({ type: "MULLIGAN", returnIds: [] });
  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.phase, "MAIN");

  const firstEmployee = match.players.P1.hand.find((card) => card.definitionId === "N-001")!;
  const employeeOption = match.legalActions.playableEmployees.find((entry) => entry.cardId === firstEmployee.instanceId)!;
  match = submit({ type: "PLAY_EMPLOYEE", cardId: employeeOption.cardId, slot: 0 });
  const incident = match.players.P1.hand.find((card) => card.definitionId === "CS-010")!;
  const incidentOption = match.legalActions.settableIncidents.find((entry) => entry.cardId === incident.instanceId)!;
  match = submit({ type: "SET_INCIDENT", cardId: incidentOption.cardId, slot: incidentOption.slots[0] });
  assert.equal(match.players.P1.availableCapacity, 0, "Tutorial uses the normal 2-capacity curve: 1 for Employee plus 1 for Incident.");

  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.activePlayerId, "P1");
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "DECLARE_ATTACK", attackerId: match.legalActions.attacks[0].attackerId, targetId: match.legalActions.attacks[0].targetIds[0] });
  assert.equal(match.players.P1.employeeField.filter(Boolean).length, 0, "Equal-power combat destroys the first Employee.");
  assert.equal(match.players.P2.employeeField.filter(Boolean).length, 0, "Equal-power combat destroys the Coach Employee.");
  match = submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.phase, "START");
  assert.equal(match.activePlayerId, "P1");

  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.phase, "MAIN");
  const secondEmployee = match.players.P1.hand.find((card) => card.definitionId === "N-002")!;
  const secondEmployeeOption = match.legalActions.playableEmployees.find((entry) => entry.cardId === secondEmployee.instanceId)!;
  submit({ type: "PLAY_EMPLOYEE", cardId: secondEmployeeOption.cardId, slot: 0 });
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.phase, "START");
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.phase, "BATTLE");
  const directAttack = match.legalActions.attacks[0];
  assert.ok(directAttack, "The guided board must expose a direct attack after the Coach has no Employee.");
  const reputationBefore = match.players.P2.reputation;
  const directPower = match.players.P1.employeeField.find(Boolean)!.currentPower ?? 0;
  assert.ok(directPower > 0);
  match = submit({ type: "DECLARE_ATTACK", attackerId: directAttack.attackerId, targetId: null });
  assert.equal(match.players.P2.reputation, reputationBefore - directPower);
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  assert.equal(view.match?.phase, "START");
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  submit({ type: "ADVANCE_PHASE" });
  match = submit({ type: "ADVANCE_PHASE" });
  assert.equal(match.responseWindow?.event, "ATTACK_DECLARED");
  const response = match.legalActions.responseOptions[0];
  assert.ok(response, "The Coach attack must expose the deterministic Incident response.");
  match = submit({ type: "ACTIVATE_RESPONSE", sourceId: response.sourceId, abilityId: response.abilityId });
  if (match.responseWindow) match = submit({ type: "PASS_PRIORITY" });
  assert.equal(match.status, "ENDED");
  assert.equal(match.winnerId, "P1");
});

function roomServiceSubmit(
  roomService: RoomService,
  room: ReturnType<RoomService["createBotRoom"]>,
  intent: MatchIntent,
  expectedStateVersion: number,
  intentId = `intent-${expectedStateVersion}-${intent.type}`
) {
  return roomService.submitIntent(room.roomId, room.token, { intentId, expectedStateVersion, intent });
}

console.log(`\n${passed}/${passed} v7.69.44 Tutorial progression tests passed.`);
