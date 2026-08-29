import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { createMatch } from "../src/engine.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { projectStateForViewer } from "../src/projection.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function freshMatch() {
  return createMatch({
    matchId: "v18", seed: 18001, firstPlayerId: "P1", definitions: alphaDefinitions,
    p1Deck: alphaDeckPresets["customer-service-starter"].cards,
    p2Deck: alphaDeckPresets["it-starter"].cards,
    format: ALPHA_FORMAT
  });
}

test("pending delayed cards are projected as public card objects with due timing", () => {
  const state = freshMatch();
  const source = state.players.P1.hand.shift()!;
  state.cards[source].zone = "PENDING";
  state.cards[source].objectVersion += 1;
  state.pendingResolutions.push({
    id: "PENDING-TEST", sourceInstanceId: source, sourceObjectVersion: state.cards[source].objectVersion,
    controllerId: "P1", abilityId: "TEST-A1", dueTurnsStarted: state.players.P1.turnsStarted + 1,
    phase: "MAIN", effects: [], targets: {}, targetObjectVersions: {}
  });
  const p1 = projectStateForViewer(state, "P1");
  const p2 = projectStateForViewer(state, "P2");
  assert.equal(p1.pendingResolutions.length, 1);
  assert.equal(p2.pendingResolutions.length, 1);
  assert.equal(p2.pendingResolutions[0].sourceId, source);
  assert.equal(p2.pendingResolutions[0].card.definitionId, state.cards[source].definitionId, "PENDING is public information");
  assert.equal(p2.pendingResolutions[0].phase, "MAIN");
});

test("pending attack projection exposes only public attacker/target references", () => {
  const state = freshMatch();
  const attacker = state.players.P1.hand.shift()!;
  const defender = state.players.P2.hand.shift()!;
  state.cards[attacker].zone = "EMPLOYEE_FIELD"; state.cards[attacker].slot = 0; state.players.P1.employeeField[0] = attacker;
  state.cards[defender].zone = "EMPLOYEE_FIELD"; state.cards[defender].slot = 0; state.players.P2.employeeField[0] = defender;
  state.pendingAttack = { attackerId: attacker, targetId: defender, originalTargetId: defender, controllerId: "P1", cancelled: false };
  const p2 = projectStateForViewer(state, "P2");
  assert.deepEqual(p2.pendingAttack, { attackerId: attacker, targetId: defender, controllerId: "P1", cancelled: false });
});

test("v1.8 browser includes pending lane, attack connector, resource meters and card-type frame colors", () => {
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
  assert.match(app, /function renderPendingLane/);
  assert.match(app, /function renderAttackOverlay/);
  assert.match(app, /function drawAttackConnector/);
  assert.match(app, /function renderResources/);
  assert.match(app, /type-\$\{esc\(\(def\?\.cardType/);
  assert.match(css, /\.pending-lane/);
  assert.match(css, /\.attack-overlay/);
  assert.match(css, /\.resource-cluster/);
  assert.match(css, /\.card\.type-employee/);
  assert.match(css, /\.card\.type-incident/);
  assert.match(css, /\.card\.type-action/);
  assert.match(css, /\.card\.type-system/);
});

console.log(`${passed}/3 v1.8 tests passed.`);
