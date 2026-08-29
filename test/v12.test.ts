import { alphaDefinitions } from "../src/cards.js";
import {
  advancePhase,
  createMatch,
  declareAttack,
  getCurrentPower,
  mulligan,
  playAction,
  playEmployee,
  playSystem
} from "../src/engine.js";
import type { GameState, PlayerId } from "../src/types.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, pattern: RegExp, message: string) {
  let thrown: unknown = null;
  try { fn(); } catch (error) { thrown = error; }
  assert(thrown instanceof Error && pattern.test(thrown.message), message);
}

const tests: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) { tests.push([name, fn]); }

function mixedMatch(
  p1Deck: Array<{ definitionId: string; copies: number }>,
  p2Deck: Array<{ definitionId: string; copies: number }>
): GameState {
  const state = createMatch({
    matchId: "v12",
    seed: 1200,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck,
    p2Deck
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  return state;
}

function forceToHand(state: GameState, playerId: PlayerId, definitionId: string): string {
  const player = state.players[playerId];
  const existing = player.hand.find((id) => state.cards[id].definitionId === definitionId);
  if (existing) return existing;
  const index = player.deck.findIndex((id) => state.cards[id].definitionId === definitionId);
  if (index < 0) throw new Error(`No ${definitionId} available`);
  const [id] = player.deck.splice(index, 1);
  state.cards[id].zone = "HAND";
  state.cards[id].objectVersion += 1;
  state.cards[id].faceUp = false;
  player.hand.push(id);
  return id;
}

function toMain(state: GameState, playerId: PlayerId) {
  if (state.phase === "START") advancePhase(state, playerId);
  if (state.phase === "DRAW") advancePhase(state, playerId);
  assert(state.phase === "MAIN", "Expected Main Phase");
}

function finishTurn(state: GameState, playerId: PlayerId) {
  if (state.phase === "MAIN") advancePhase(state, playerId);
  if (state.phase === "BATTLE") advancePhase(state, playerId);
  if (state.phase === "END") advancePhase(state, playerId);
}

test("v1.2 baseline of at least 71 fully engine-backed cards is preserved", () => {
  const statuses = Object.values(alphaDefinitions).map((x) => x.implementationStatus ?? "FULL");
  assert(statuses.filter((x) => x === "FULL").length >= 71, "Expected v1.2 FULL coverage baseline to be preserved");
});

test("Customer Service Agent triggers on the first later Ticket card and only once per turn", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 40 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const first = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", first, 0);
  const second = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", second, 1);
  assert(getCurrentPower(state, first) === 3, "First Agent should gain +1 from the next Ticket play");
  const third = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", third, 2);
  assert(getCurrentPower(state, first) === 3, "First Agent should not trigger twice in the same turn");
});

test("Call Center Agent gains Capacity exactly when the second Call card of the turn is played", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-002", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const callCenter = forceToHand(state, "P1", "CS-002");
  playEmployee(state, "P1", callCenter, 0);
  const before = state.players.P1.availableCapacity;
  const call = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", call, 1);
  assert(state.players.P1.availableCapacity === before - 1, "Second Call should cost 2 and refund 1 Capacity via Call Center Agent");
});

test("Team Lead Customer Service buffs other CS Employees only during the opponent turn", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "CS-006", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 30;
  const material = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", material, 0);
  const lead = forceToHand(state, "P1", "CS-006");
  playEmployee(state, "P1", lead, 0, [material]);
  const colleague = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", colleague, 1);
  assert(getCurrentPower(state, colleague) === 2, "Bonus should not apply during controller's own turn");
  finishTurn(state, "P1");
  assert(state.activePlayerId === "P2", "Opponent should now be active");
  assert(getCurrentPower(state, colleague) === 3, "Other CS Employee should gain +1 during opponent turn");
});

test("Review Portal adds one extra Reputation to the first restore each turn", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-013", copies: 10 }, { definitionId: "CS-014", copies: 30 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  state.players.P1.reputation = 10;
  const portal = forceToHand(state, "P1", "CS-013");
  playSystem(state, "P1", portal, 0);
  const review = forceToHand(state, "P1", "CS-014");
  playAction(state, "P1", review);
  assert(state.players.P1.reputation === 14, "Five-Star Review 3 + Review Portal 1 should restore 4 total");
});

test("DevOps Engineer gains Capacity after a System is played through Deploy", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-004", copies: 10 }, { definitionId: "IT-011", copies: 10 }, { definitionId: "IT-014", copies: 20 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const devops = forceToHand(state, "P1", "IT-004");
  playEmployee(state, "P1", devops, 0);
  const deployment = forceToHand(state, "P1", "IT-011");
  const cluster = forceToHand(state, "P1", "IT-014");
  const before = state.players.P1.availableCapacity;
  playAction(state, "P1", deployment, { SYSTEM: [cluster] });
  assert(state.players.P1.availableCapacity === before - 1, "Friday Deployment costs 2 and DevOps should return 1 Capacity");
  assert(state.cards[cluster].lastPlayMethod === "DEPLOY", "System should retain DEPLOY play method");
});

test("Calendar Block prevents its target from attacking during its next Battle Phase", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-008", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  // Put an opposing employee on the field for the target selector.
  const enemy = forceToHand(state, "P2", "IT-001");
  state.players.P2.hand = state.players.P2.hand.filter((id) => id !== enemy);
  state.cards[enemy].zone = "EMPLOYEE_FIELD";
  state.cards[enemy].slot = 0;
  state.cards[enemy].faceUp = true;
  state.cards[enemy].onboarding = false;
  state.cards[enemy].enteredFieldTurnNumber = 0;
  state.players.P2.employeeField[0] = enemy;
  const block = forceToHand(state, "P1", "OFC-008");
  playAction(state, "P1", block, { TARGET_1: [enemy] });
  finishTurn(state, "P1");
  toMain(state, "P2");
  advancePhase(state, "P2");
  assertThrows(() => declareAttack(state, "P2", enemy, null), /cannot attack/, "Calendar-blocked Employee should be unable to attack");
});

test("Chief Marketing Officer deals 1 Reputation when the third Marketing Action is played", () => {
  const state = mixedMatch(
    [{ definitionId: "MKT-001", copies: 20 }, { definitionId: "MKT-007", copies: 5 }, { definitionId: "MKT-009", copies: 15 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 40;
  const m1 = forceToHand(state, "P1", "MKT-001");
  playEmployee(state, "P1", m1, 0);
  const m2 = forceToHand(state, "P1", "MKT-001");
  playEmployee(state, "P1", m2, 1);
  const cmo = forceToHand(state, "P1", "MKT-007");
  playEmployee(state, "P1", cmo, 0, [m1, m2]);
  for (let i = 0; i < 3; i++) {
    const action = forceToHand(state, "P1", "MKT-009");
    playAction(state, "P1", action, { TARGET_1: [cmo] });
  }
  assert(state.players.P2.reputation === 19, "CMO should deal exactly 1 Reputation on the third Marketing Action");
});

test("Full Production buffs the whole Production board and grants Breakthrough at four Employees", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 30 }, { definitionId: "PRD-009", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 30;
  const workers: string[] = [];
  for (let slot = 0; slot < 4; slot++) {
    const worker = forceToHand(state, "P1", "PRD-001");
    workers.push(worker);
    playEmployee(state, "P1", worker, slot);
  }
  const fullProduction = forceToHand(state, "P1", "PRD-009");
  playAction(state, "P1", fullProduction);
  for (const worker of workers) {
    assert(getCurrentPower(state, worker) === 2, "Every Production Worker should gain +1 Power");
    assert(state.cards[worker].keywordModifiers.some((x) => x.keyword === "BREAKTHROUGH"), "Every Production Employee should gain Breakthrough at four Employees");
  }
});

test("Conveyor Belt buff survives the opponent turn and expires at the start of the next own turn", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-014", copies: 10 }, { definitionId: "PRD-001", copies: 30 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const belt = forceToHand(state, "P1", "PRD-014");
  playSystem(state, "P1", belt, 0);
  const worker = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", worker, 0);
  assert(getCurrentPower(state, worker) === 2, "Conveyor Belt should buff the first Production Staff played");
  finishTurn(state, "P1");
  assert(getCurrentPower(state, worker) === 2, "Buff should remain during opponent turn");
  toMain(state, "P2");
  finishTurn(state, "P2");
  assert(state.activePlayerId === "P1", "P1 should have started the next turn");
  assert(getCurrentPower(state, worker) === 1, "Buff should expire at start of next own turn");
});

test("Presentation restores Reputation when its target is a Lead", () => {
  const state = mixedMatch(
    [{ definitionId: "N-001", copies: 15 }, { definitionId: "N-004", copies: 10 }, { definitionId: "N-005", copies: 15 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 30;
  state.players.P1.reputation = 10;
  const intern = forceToHand(state, "P1", "N-001");
  playEmployee(state, "P1", intern, 0);
  const lead = forceToHand(state, "P1", "N-004");
  playEmployee(state, "P1", lead, 0, [intern]);
  const presentation = forceToHand(state, "P1", "N-005");
  playAction(state, "P1", presentation, { TARGET_1: [lead] });
  assert(getCurrentPower(state, lead) === 6, "Presentation should give +2 Power to Interim Team Lead");
  assert(state.players.P1.reputation === 11, "Presentation should restore 1 Reputation for a Lead target");
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
console.log(`\nv1.2 trigger/status/mass-effect tests: ${passed}/${tests.length} passed`);
