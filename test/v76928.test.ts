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

test("v7.69.72 release version is current", () => {
  assert.equal(packageJson.version, "7.69.72");
});

function service(firstPlayerId: "P1" | "P2" = "P1"): RoomService {
  let roomNumber = 0;
  let tokenNumber = 0;
  return new RoomService({
    roomIdFactory: () => `TUTORIAL-${++roomNumber}`,
    tokenFactory: () => `token-${++tokenNumber}`,
    seedFactory: () => 76960,
    firstPlayerFactory: () => firstPlayerId,
    nowFactory: (() => { let now = 1000; return () => ++now; })()
  });
}

function createBotRoom(mode: "TRAINING" | "TUTORIAL") {
  const roomService = service();
  return { roomService, room: roomService.createBotRoom("it-starter", { mode }) };
}

function submit(
  roomService: RoomService,
  room: ReturnType<RoomService["createBotRoom"]>,
  view: ReturnType<RoomService["createBotRoom"]>["view"],
  intent: MatchIntent,
  label: string
) {
  const result = roomService.submitIntent(room.roomId, room.token, {
    intentId: `tutorial-v2-${label}-${view.match?.stateVersion ?? 0}`,
    expectedStateVersion: view.match!.stateVersion,
    intent
  });
  assert.equal(result.response.accepted, true, result.response.error?.message ?? `Tutorial intent ${intent.type} was rejected.`);
  return result.view;
}

test("desktop Tutorial guidance is compact and does not consume the arena grid row", () => {
  assert.match(styles, /@media \(min-width:761px\) \{\s*\.arena-board-column > \.tutorial-guide \{[\s\S]*?position:absolute;[\s\S]*?pointer-events:none;/);
  assert.match(styles, /\.arena-board-column > \.tutorial-guide[\s\S]*?top:48px;[\s\S]*?max-width:calc\(100% - clamp\(320px,24vw,420px\)\)/);
  assert.match(app, /function renderTutorialGuide\(match\)/);
  assert.match(app, /<div class="arena-board-column">\s*\$\{renderTutorialGuide\(match\)\}/);
  assert.match(app, /function requestPhaseAdvance\(match\)/);
  assert.match(app, /complete-tutorial/);
  assert.match(styles, /body\.match-mode \.own-hand\s*\{[\s\S]*?pointer-events:auto;[\s\S]*?z-index:24;/);
  assert.match(styles, /body\.match-mode \.board-phase-divider \.phase-track\s*\{[\s\S]*?height:100%;[\s\S]*?min-height:0;[\s\S]*?padding:0;/);
  assert.match(styles, /body\.match-mode \.board-phase-divider \.phase-track span\s*\{[\s\S]*?height:auto;[\s\S]*?min-height:0;[\s\S]*?align-self:stretch;/);
  assert.match(styles, /body\.match-mode \.board-phase-divider\.turn-owner-opponent \.phase-track span\.active/);
});

test("Tutorial starts with explicit metadata and a teaching-safe opening", () => {
  const { room: created } = createBotRoom("TUTORIAL");
  assert.equal(created.view.settings.mode, "TUTORIAL");
  assert.equal(created.view.settings.bot, true);
  assert.equal(created.view.settings.rewardEligible, false);
  assert.equal(created.view.match?.phase, "MULLIGAN");
  const opening = created.view.match?.players?.P1?.hand?.map((card) => card.definitionId);
  assert.deepEqual(opening, ["N-002", "N-009", "N-005", "N-010", "N-013"]);
  assert.equal(created.view.match?.players?.P1?.employeeField?.filter(Boolean).length, 2);
  assert.equal(created.view.match?.firstPlayerId, "P2", "Coach opens so the player receives a deterministic Employee target");
  assert.match(root("server/server.mjs"), /fixedFirstPlayerId:"P2"/);
  assert.match(root("server/server.mjs"), /forcePlayerOpeningFieldDefinitionIds/);
  assert.match(root("server/server.mjs"), /forceOpeningDefinitionIds/);
  assert.match(root("server/server.mjs"), /forceOpponentOpeningFieldDefinitionIds/);
  assert.doesNotMatch(root("public/tutorial-script.js"), /play-second-employee/);
  assert.match(root("public/tutorial-script.js"), /hasMandatoryInteraction/);
  assert.doesNotMatch(root("public/tutorial-script.js"), /response-setup/);
  assert.match(root("public/app.js"), /state\.view\?\.settings\?\.mode === 'TUTORIAL'/);
});

test("Tutorial mulligan auto-advances safe boundaries into the guided Main phase", () => {
  const { roomService, room } = createBotRoom("TUTORIAL");
  const kept = roomServiceSubmit(roomService, room, { type: "MULLIGAN", returnIds: [] }, room.view.match!.stateVersion);
  assert.equal(kept.response.accepted, true);
  assert.equal(kept.view.match?.phase, "MAIN");
  assert.equal(kept.view.match?.activePlayerId, "P1");
  assert.equal(kept.view.match?.players.P2.employeeField.filter(Boolean).length, 1);
  assert.equal(kept.view.match?.legalActions.archiveExcessHandIds.length, 0);
  assert.equal(kept.view.match?.players.P1.hand.length, 6, "The deterministic opening remains below the hand limit after the opening draw.");
  assert.equal(kept.response.events.filter((event) => event.type === "PHASE_CHANGED").length >= 2, true);
});

test("short Tutorial completes Employee, Support, combat and direct attack in one Battle phase", () => {
  const { roomService, room } = createBotRoom("TUTORIAL");
  let view = room.view;
  const doSubmit = (intent: MatchIntent, label: string) => {
    view = submit(roomService, room, view, intent, label);
    return view.match!;
  };

  let match = doSubmit({ type: "MULLIGAN", returnIds: [] }, "mulligan");
  assert.equal(match.phase, "MAIN");

  const intern = match.players.P1.hand.find((card) => card.definitionId === "N-002")!;
  const internOption = match.legalActions.playableEmployees.find((entry) => entry.cardId === intern.instanceId)!;
  match = doSubmit({ type: "PLAY_EMPLOYEE", cardId: internOption.cardId, slot: internOption.options[0].slot }, "employee");

  const coffee = match.players.P1.hand.find((card) => card.definitionId === "N-009")!;
  const coffeeOption = match.legalActions.playableActions.find((entry) => entry.cardId === coffee.instanceId)!;
  assert.equal(coffeeOption.targetChoices.length, 1, "Kaffeeplausch must expose its real employee target choice.");
  const coffeeTarget = coffeeOption.targetChoices[0].candidateIds[0];
  match = doSubmit({ type: "PLAY_ACTION", cardId: coffeeOption.cardId, targets: { [coffeeOption.targetChoices[0].selectorId]: [coffeeTarget] } }, "support");

  const supportEvents = view.events?.map((event) => event.type) ?? [];
  assert.ok(supportEvents.includes("CARD_PLAYED"), "Support play must emit CARD_PLAYED authoritatively.");
  assert.ok(supportEvents.includes("ACTION_RESOLVED"), "Support target confirmation must emit ACTION_RESOLVED authoritatively.");
  assert.ok(supportEvents.includes("CHAIN_RESOLVED"), "Support target confirmation must close the Chain authoritatively.");
  assert.equal(match.players.P1.employeeField.filter(Boolean).length, 3);
  assert.equal(match.legalActions.archiveExcessHandIds.length, 0);
  assert.ok(match.players.P1.hand.length <= 8);

  match = doSubmit({ type: "ADVANCE_PHASE" }, "battle");
  assert.equal(match.phase, "BATTLE");
  const employeeAttack = match.legalActions.attacks.find((attack) => attack.targetIds.some((targetId) => targetId !== null));
  assert.ok(employeeAttack, "The first Employee must have a legal Coach target.");
  match = doSubmit({ type: "DECLARE_ATTACK", attackerId: employeeAttack!.attackerId, targetId: employeeAttack!.targetIds.find((targetId) => targetId !== null)! }, "attack-employee");
  assert.equal(match.players.P2.employeeField.filter(Boolean).length, 0, "The equal-power Coach Employee is cleared.");

  const directAttack = match.legalActions.attacks.find((attack) => attack.targetIds.includes(null));
  assert.ok(directAttack, "The second legal Employee must be able to attack REP in the same Battle phase.");
  const reputationBefore = match.players.P2.reputation;
  const directPower = match.players.P1.employeeField.find((card) => card?.instanceId === directAttack!.attackerId)!.currentPower ?? 0;
  match = doSubmit({ type: "DECLARE_ATTACK", attackerId: directAttack!.attackerId, targetId: null }, "direct-attack");
  assert.equal(match.players.P2.reputation, reputationBefore - directPower);

  match = doSubmit({ type: "ADVANCE_PHASE" }, "end");
  assert.equal(match.phase, "END");
  match = doSubmit({ type: "COMPLETE_TUTORIAL" }, "complete");
  assert.equal(match.status, "ENDED");
  assert.equal(match.winnerId, "P1");
  assert.equal(match.reason, "TUTORIAL_COMPLETE");
  assert.equal(match.players.P1.hand.length <= 8, true);
});

test("Tutorial mandatory-interaction precedence is explicit and the Lobby has one Quick Match action", () => {
  const script = root("public/tutorial-script.js");
  assert.match(script, /if \(hasMandatoryInteraction\(match\)\)/);
  assert.match(script, /if \(hasMandatoryInteraction\(match\)\) return true/);
  assert.match(script, /id:'end-phase',[\s\S]*allowed:\['ADVANCE_PHASE','COMPLETE_TUTORIAL'\]/);
  assert.match(styles, /\.dialog-primary-text/);
  assert.match(styles, /\.dialog-secondary-text/);
  assert.match(styles, /\.target-chip/);
  assert.match(styles, /\.dialog-confirm/);
  assert.match(styles, /\.dialog-cancel/);
  assert.equal((app.match(/id="quickMatchBtn"/g) ?? []).length, 1);
  const navCurrent = app.match(/<div class="desk-nav-current"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(navCurrent, /Match Queue/);
  assert.doesNotMatch(navCurrent, /Quick Match/);
});

test("normal PvP and Training mulligan transitions remain engine-authoritative", () => {
  const base = createMatch({
    matchId: "mulligan-regression",
    seed: 76960,
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

function roomServiceSubmit(
  roomService: RoomService,
  room: ReturnType<RoomService["createBotRoom"]>,
  intent: MatchIntent,
  expectedStateVersion: number,
  intentId = `intent-${expectedStateVersion}-${intent.type}`
) {
  return roomService.submitIntent(room.roomId, room.token, { intentId, expectedStateVersion, intent });
}

console.log(`\n${passed}/${passed} Tutorial v2 progression tests passed.`);
