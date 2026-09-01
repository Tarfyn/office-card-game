import { strict as assert } from "node:assert";
import { createMatch, mulligan } from "../src/engine.js";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { RoomService } from "../src/room.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const styles = root("public/styles.css");
const app = root("public/app.js");
const packageJson = JSON.parse(root("package.json"));

test("v7.69.29 release version is current", () => {
  assert.equal(packageJson.version, "7.69.29");
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
});

test("Keep then Continue reaches authoritative Draw and guided Main exactly once", () => {
  const { roomService, room } = createBotRoom("TUTORIAL");
  const kept = roomServiceSubmit(roomService, room, { type: "MULLIGAN", returnIds: [] }, room.view.match!.stateVersion);
  assert.equal(kept.response.accepted, true);
  assert.equal(kept.view.match?.phase, "START");

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

  const main = roomServiceSubmit(roomService, room, { type: "ADVANCE_PHASE" }, draw.view.match!.stateVersion, "tutorial-main");
  assert.equal(main.response.accepted, true);
  assert.equal(main.view.match?.phase, "MAIN");
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

function roomServiceSubmit(
  roomService: RoomService,
  room: ReturnType<RoomService["createBotRoom"]>,
  intent: { type: "MULLIGAN"; returnIds: string[] } | { type: "ADVANCE_PHASE" },
  expectedStateVersion: number,
  intentId = `intent-${expectedStateVersion}-${intent.type}`
) {
  return roomService.submitIntent(room.roomId, room.token, { intentId, expectedStateVersion, intent });
}

console.log(`\n${passed}/${passed} v7.69.29 Tutorial progression tests passed.`);
