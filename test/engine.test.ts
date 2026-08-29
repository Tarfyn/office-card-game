import { alphaDefinitions } from "../src/cards.js";
import { advancePhase, createMatch, declareAttack, findInHandByDefinition, mulligan, playEmployee } from "../src/engine.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, pattern: RegExp, message: string) {
  let thrown: unknown = null;
  try { fn(); } catch (error) { thrown = error; }
  assert(thrown instanceof Error && pattern.test(thrown.message), message);
}

function deck(definitionId: string) {
  return [{ definitionId, copies: 40 }];
}

function readyMatch(firstPlayerId: "P1" | "P2" = "P1") {
  const state = createMatch({
    matchId: "test",
    seed: 123,
    firstPlayerId,
    definitions: alphaDefinitions,
    p1Deck: deck("CS-001"),
    p2Deck: deck("IT-001")
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  return state;
}

const tests: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) { tests.push([name, fn]); }

test("first player opens the office and skips the first draw", () => {
  const state = readyMatch("P1");
  assert(state.players.P1.hand.length === 5, "P1 should start with five cards");
  advancePhase(state, "P1");
  assert(state.phase === "DRAW", "Should be in Draw Phase");
  assert(state.players.P1.hand.length === 5, "First player should not draw");
  assert(state.eventLog[state.eventLog.length - 1]?.type === "DRAW_SKIPPED", "Expected DRAW_SKIPPED event");
});

test("second player draws normally on their first turn", () => {
  const state = readyMatch("P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  assert(state.activePlayerId === "P2", "P2 should be active");
  advancePhase(state, "P2");
  assert(state.players.P2.hand.length === 6, "P2 should draw to six cards");
});

test("capacity follows 2 -> 3 and refills", () => {
  const state = readyMatch("P1");
  assert(state.players.P1.maxCapacity === 2, "P1 should begin at 2 Max Capacity");
  assert(state.players.P1.availableCapacity === 2, "P1 should begin with 2 Capacity");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  const employee = findInHandByDefinition(state, "P1", "CS-001")!;
  playEmployee(state, "P1", employee, 0);
  assert(state.players.P1.availableCapacity === 0, "2-cost Employee should spend all Capacity");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  assert(state.activePlayerId === "P1", "P1 should be active again");
  assert(state.players.P1.maxCapacity === 3, "P1 second turn should have 3 Max Capacity");
  assert(state.players.P1.availableCapacity === 3, "P1 Capacity should refill to 3");
});

test("new Employees are in Onboarding and cannot attack immediately", () => {
  const state = readyMatch("P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  const employee = state.players.P1.hand[0];
  playEmployee(state, "P1", employee, 0);
  advancePhase(state, "P1");
  assertThrows(() => declareAttack(state, "P1", employee, null), /Onboarding/, "Onboarding Employee attack should fail");
});

test("equal Power destroys both Employees", () => {
  const state = readyMatch("P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  const p1 = state.players.P1.hand[0];
  playEmployee(state, "P1", p1, 0);
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  const p2 = state.players.P2.hand[0];
  playEmployee(state, "P2", p2, 0);
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  declareAttack(state, "P1", p1, p2);
  assert(state.players.P1.employeeField[0] === null, "P1 Employee should be destroyed");
  assert(state.players.P2.employeeField[0] === null, "P2 Employee should be destroyed");
  assert(state.players.P1.archive.includes(p1), "P1 Employee should be in Archive");
  assert(state.players.P2.archive.includes(p2), "P2 Employee should be in Archive");
});

test("direct attack is forbidden while opponent controls an Employee", () => {
  const state = readyMatch("P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  const p1 = state.players.P1.hand[0];
  playEmployee(state, "P1", p1, 0);
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  const p2 = state.players.P2.hand[0];
  playEmployee(state, "P2", p2, 0);
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  assertThrows(() => declareAttack(state, "P1", p1, null), /Cannot attack Company Reputation/, "Direct attack should be blocked");
});


test("direct attack deals Power as Company Reputation damage", () => {
  const state = readyMatch("P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  const p1 = state.players.P1.hand[0];
  playEmployee(state, "P1", p1, 0);
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P2");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  declareAttack(state, "P1", p1, null);
  assert(state.players.P2.reputation === 18, "2 Power direct attack should deal 2 Reputation damage");
});

test("objectVersion increases when a card changes zones", () => {
  const state = readyMatch("P1");
  const cardId = state.players.P1.hand[0];
  const inHandVersion = state.cards[cardId].objectVersion;
  advancePhase(state, "P1");
  advancePhase(state, "P1");
  playEmployee(state, "P1", cardId, 0);
  assert(state.cards[cardId].objectVersion === inHandVersion + 1, "Zone change should increment objectVersion");
});

// v0.2 tests ---------------------------------------------------------------
import { activateAbility, getCurrentPower, playAction, playSystem } from "../src/engine.js";
import type { GameState, PlayerId } from "../src/types.js";

function forceToHand(state: GameState, playerId: PlayerId, definitionId: string): string {
  const player = state.players[playerId];
  const existing = player.hand.find((id) => state.cards[id].definitionId === definitionId);
  if (existing) return existing;
  const index = player.deck.findIndex((id) => state.cards[id].definitionId === definitionId);
  if (index < 0) throw new Error(`No ${definitionId} available to force into hand`);
  const [id] = player.deck.splice(index, 1);
  const card = state.cards[id];
  card.zone = "HAND";
  card.objectVersion += 1;
  card.faceUp = false;
  player.hand.push(id);
  return id;
}

function mixedMatch(p1Deck: Array<{ definitionId: string; copies: number }>, p2Deck: Array<{ definitionId: string; copies: number }>) {
  const state = createMatch({
    matchId: "mixed",
    seed: 987,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck,
    p2Deck
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  return state;
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

test("Actions validate targets, modify Power, resolve, and Archive", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "N-006", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  const p1Employee = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", p1Employee, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  const p2Employee = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", p2Employee, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  const action = forceToHand(state, "P1", "N-006");
  playAction(state, "P1", action, { TARGET_1: [p2Employee] });
  assert(getCurrentPower(state, p2Employee) === 1, "Forgot My Lunch should reduce opposing Employee Power by 1");
  assert(state.players.P1.archive.includes(action), "Resolved Action should be in Archive");
});

test("temporary Power modifiers expire after the current turn", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "N-007", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  const employee = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", employee, 0);
  state.players.P1.availableCapacity = 2;
  const action = forceToHand(state, "P1", "N-007");
  playAction(state, "P1", action, { TARGETS: [employee] });
  assert(getCurrentPower(state, employee) === 3, "Order Takeout should add 1 Power");
  finishTurn(state, "P1");
  assert(getCurrentPower(state, employee) === 2, "End-of-turn modifier should expire before opponent turn");
});

test("Systems occupy Support slots and activated abilities can gain Capacity above max", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-001", copies: 30 }, { definitionId: "IT-014", copies: 10 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  const employee = forceToHand(state, "P1", "IT-001");
  playEmployee(state, "P1", employee, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  finishTurn(state, "P2");
  toMain(state, "P1");
  const system = forceToHand(state, "P1", "IT-014");
  playSystem(state, "P1", system, 0);
  state.players.P1.availableCapacity = state.players.P1.maxCapacity;
  activateAbility(state, "P1", system, "IT-014-A1");
  assert(state.players.P1.availableCapacity === state.players.P1.maxCapacity + 1, "Server Cluster should allow temporary Capacity above max");
  assertThrows(() => activateAbility(state, "P1", system, "IT-014-A1"), /usage limit/, "Server Cluster should be once per turn");
});

test("System activated ability checks its board condition", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-014", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const system = forceToHand(state, "P1", "IT-014");
  playSystem(state, "P1", system, 0);
  assertThrows(() => activateAbility(state, "P1", system, "IT-014-A1"), /conditions/, "Server Cluster should require an IT Employee");
});

test("Going Viral gets bonus damage exactly as the third Marketing Action", () => {
  const state = mixedMatch(
    [
      { definitionId: "MKT-005", copies: 10 },
      { definitionId: "MKT-009", copies: 10 },
      { definitionId: "MKT-010", copies: 10 },
      { definitionId: "MKT-012", copies: 10 }
    ],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const employee = forceToHand(state, "P1", "MKT-005");
  playEmployee(state, "P1", employee, 0);
  const a1 = forceToHand(state, "P1", "MKT-009");
  const a2 = forceToHand(state, "P1", "MKT-010");
  const viral = forceToHand(state, "P1", "MKT-012");
  playAction(state, "P1", a1, { TARGET_1: [employee] });
  playAction(state, "P1", a2, { TARGET_1: [employee] });
  playAction(state, "P1", viral);
  assert(state.players.P2.reputation === 16, "Third-action Going Viral should deal 4 Reputation damage");
  assert(state.players.P1.turnCounters.actionsPlayedByDepartment.MARKETING === 3, "Marketing Action counter should be 3");
});

test("Assembly Line applies a dynamic continuous Battle Phase Power bonus", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 30 }, { definitionId: "PRD-013", copies: 10 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const workers = [0, 1, 2].map((slot) => {
    const id = forceToHand(state, "P1", "PRD-001");
    playEmployee(state, "P1", id, slot);
    return id;
  });
  const line = forceToHand(state, "P1", "PRD-013");
  playSystem(state, "P1", line, 0);
  assert(getCurrentPower(state, workers[0]) === 1, "Assembly Line should not buff outside Battle Phase");
  advancePhase(state, "P1");
  assert(state.phase === "BATTLE", "Expected Battle Phase");
  assert(getCurrentPower(state, workers[0]) === 2, "Assembly Line should add 1 Power during Battle with 3 Production Staff");
});

test("Action target selectors reject illegal own-side targets", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "N-006", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const ownEmployee = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", ownEmployee, 0);
  const action = forceToHand(state, "P1", "N-006");
  assertThrows(() => playAction(state, "P1", action, { TARGET_1: [ownEmployee] }), /Illegal target/, "Opponent target selector should reject own Employee");
});



// v0.3 interaction tests ---------------------------------------------------
import { activateIncident, declareAttackInteractive, getAvailableIncidentResponses, passPriority, playActionInteractive, setIncident } from "../src/engine.js";

test("Please Hold interrupts an attack through Priority and Chain resolution", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 20 }, { definitionId: "CS-010", copies: 20 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  const defender = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", defender, 0);
  const hold = forceToHand(state, "P1", "CS-010");
  setIncident(state, "P1", hold, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  const attacker = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", attacker, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  advancePhase(state, "P2");

  declareAttackInteractive(state, "P2", attacker, defender);
  const responses = getAvailableIncidentResponses(state, "P1");
  assert(responses.some((entry) => entry.sourceId === hold && entry.abilityId === "CS-010-A1"), "Please Hold should be a legal response");
  activateIncident(state, "P1", hold, "CS-010-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");

  assert(state.players.P1.employeeField.includes(defender), "Defender should survive Please Hold");
  assert(state.players.P2.employeeField.includes(attacker), "Attacker should remain on field");
  assert(state.cards[attacker].attacksUsed === 1, "Interrupted attack should still be spent");
  assert(state.players.P1.archive.includes(hold), "Resolved Incident should be Archived");
  assert(state.responseWindow === null && state.chain.length === 0, "Response Window and Chain should be closed");
});

test("Works on My Machine negates a targeted Action Chain Item", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "IT-013", copies: 20 }],
    [{ definitionId: "CS-001", copies: 20 }, { definitionId: "N-006", copies: 20 }]
  );
  toMain(state, "P1");
  const works = forceToHand(state, "P1", "IT-013");
  setIncident(state, "P1", works, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  const p2Employee = forceToHand(state, "P2", "CS-001");
  playEmployee(state, "P2", p2Employee, 0);
  finishTurn(state, "P2");

  toMain(state, "P1");
  const itEmployee = forceToHand(state, "P1", "IT-001");
  playEmployee(state, "P1", itEmployee, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  const lunch = forceToHand(state, "P2", "N-006");
  playActionInteractive(state, "P2", lunch, { TARGET_1: [itEmployee] });
  const responses = getAvailableIncidentResponses(state, "P1");
  assert(responses.some((entry) => entry.sourceId === works && entry.abilityId === "IT-013-A1"), "Works on My Machine should see the targeted IT card");
  activateIncident(state, "P1", works, "IT-013-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");

  assert(getCurrentPower(state, itEmployee) === 2, "Negated Forgot My Lunch should not reduce Power");
  assert(state.players.P2.archive.includes(lunch), "Negated Action should still go to Archive");
  assert(state.players.P1.archive.includes(works), "Resolved Incident should go to Archive");
  assert(state.eventLog.some((event) => event.type === "CHAIN_ITEM_NEGATED"), "Expected CHAIN_ITEM_NEGATED event");
});

test("an interactive Action resolves after two consecutive passes when there is no response", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-001", copies: 40 }],
    [{ definitionId: "CS-001", copies: 20 }, { definitionId: "N-006", copies: 20 }]
  );
  toMain(state, "P1");
  const itEmployee = forceToHand(state, "P1", "IT-001");
  playEmployee(state, "P1", itEmployee, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const lunch = forceToHand(state, "P2", "N-006");
  playActionInteractive(state, "P2", lunch, { TARGET_1: [itEmployee] });
  passPriority(state, "P1");
  passPriority(state, "P2");
  assert(getCurrentPower(state, itEmployee) === 1, "Action should resolve after both players pass");
});

test("normal game commands are blocked while a Response Window is open", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-001", copies: 40 }],
    [{ definitionId: "CS-001", copies: 20 }, { definitionId: "N-006", copies: 20 }]
  );
  toMain(state, "P1");
  const itEmployee = forceToHand(state, "P1", "IT-001");
  playEmployee(state, "P1", itEmployee, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const lunch = forceToHand(state, "P2", "N-006");
  playActionInteractive(state, "P2", lunch, { TARGET_1: [itEmployee] });
  assertThrows(() => advancePhase(state, "P2"), /Response Window/, "Phase change should be blocked during responses");
});


// v0.4 scheduled effects, choices, deploy, overtime, promotion ----------------
import { resolveChoice } from "../src/engine.js";


function forceInstanceToArchive(state: GameState, instanceId: string): void {
  const card = state.cards[instanceId];
  const player = state.players[card.controllerId];
  player.hand = player.hand.filter((x) => x !== instanceId);
  player.deck = player.deck.filter((x) => x !== instanceId);
  player.archive = player.archive.filter((x) => x !== instanceId);
  if (card.zone === "EMPLOYEE_FIELD" && card.slot !== null) player.employeeField[card.slot] = null;
  if (card.zone === "SUPPORT_FIELD" && card.slot !== null) player.supportField[card.slot] = null;
  card.zone = "ARCHIVE";
  card.slot = null;
  card.objectVersion += 1;
  card.faceUp = true;
  card.onboarding = false;
  player.archive.push(instanceId);
}
function forceToArchive(state: GameState, playerId: PlayerId, definitionId: string): string {
  const id = forceToHand(state, playerId, definitionId);
  const player = state.players[playerId];
  player.hand = player.hand.filter((x) => x !== id);
  const card = state.cards[id];
  if (card.zone === "EMPLOYEE_FIELD" && card.slot !== null) player.employeeField[card.slot] = null;
  if (card.zone === "SUPPORT_FIELD" && card.slot !== null) player.supportField[card.slot] = null;
  card.zone = "ARCHIVE";
  card.slot = null;
  card.objectVersion += 1;
  card.faceUp = true;
  card.onboarding = false;
  player.archive.push(id);
  return id;
}

test("Ticket Reopened returns a CS Staff Employee and Archives the same object at the end of the next own turn", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 25 }, { definitionId: "CS-008", copies: 15 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const agent = forceToArchive(state, "P1", "CS-001");
  const reopen = forceToHand(state, "P1", "CS-008");
  playAction(state, "P1", reopen, { TARGET_1: [agent] });
  assert(state.players.P1.employeeField.includes(agent), "Ticket Reopened should return the Agent to the field");
  assert(state.cards[agent].onboarding, "Returned Agent should enter Onboarding");
  assert(state.scheduledEffects.length === 1, "Ticket Reopened should create a scheduled Archive effect");

  finishTurn(state, "P1");
  toMain(state, "P2");
  finishTurn(state, "P2");
  toMain(state, "P1");
  assert(state.players.P1.employeeField.includes(agent), "Agent should survive until the next own End Phase");
  finishTurn(state, "P1");
  assert(state.players.P1.archive.includes(agent), "Agent should be Archived at the scheduled End Phase");
});

test("Ticket Reopened scheduled cleanup does not affect a card after it changed objects", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 25 }, { definitionId: "CS-008", copies: 15 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const agent = forceToArchive(state, "P1", "CS-001");
  const reopen = forceToHand(state, "P1", "CS-008");
  playAction(state, "P1", reopen, { TARGET_1: [agent] });
  const revivedVersion = state.cards[agent].objectVersion;
  finishTurn(state, "P1");
  toMain(state, "P2");
  forceInstanceToArchive(state, agent);
  assert(state.cards[agent].objectVersion > revivedVersion, "Zone change should create a new object version");
  finishTurn(state, "P2");
  toMain(state, "P1");
  finishTurn(state, "P1");
  const scheduleEvent = [...state.eventLog].reverse().find((e) => e.type === "SCHEDULED_EFFECT_RESOLVED");
  assert(scheduleEvent?.data?.conditionMet === false, "Old scheduled cleanup should recognize the object changed");
});

test("Friday Deployment plays an IT System for free and only penalizes Reputation if that deployed object leaves", () => {
  const make = () => mixedMatch(
    [{ definitionId: "IT-001", copies: 15 }, { definitionId: "IT-011", copies: 10 }, { definitionId: "IT-014", copies: 15 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );

  const safe = make();
  toMain(safe, "P1");
  safe.players.P1.availableCapacity = 10;
  const deploy = forceToHand(safe, "P1", "IT-011");
  const server = forceToHand(safe, "P1", "IT-014");
  playAction(safe, "P1", deploy, { SYSTEM: [server] });
  assert(safe.players.P1.supportField.includes(server), "Friday Deployment should put Server Cluster into a Support slot");
  assert(safe.cards[server].lastPlayMethod === "DEPLOY", "System should remember DEPLOY as its play method");
  finishTurn(safe, "P1");
  toMain(safe, "P2");
  finishTurn(safe, "P2");
  assert(safe.activePlayerId === "P1", "P1 should have started their next turn");
  assert(safe.players.P1.reputation === 20, "Stable deployed System should cause no Reputation loss");

  const failed = make();
  toMain(failed, "P1");
  failed.players.P1.availableCapacity = 10;
  const deploy2 = forceToHand(failed, "P1", "IT-011");
  const server2 = forceToHand(failed, "P1", "IT-014");
  playAction(failed, "P1", deploy2, { SYSTEM: [server2] });
  forceInstanceToArchive(failed, server2);
  finishTurn(failed, "P1");
  toMain(failed, "P2");
  finishTurn(failed, "P2");
  assert(failed.players.P1.reputation === 17, "Deployment failure should cost 3 Company Reputation at the next own Start");
});

test("Overtime grants a second attack and Archives the worker in End Phase after two attacks", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 25 }, { definitionId: "PRD-011", copies: 15 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  const worker = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", worker, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  finishTurn(state, "P2");
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const overtime = forceToHand(state, "P1", "PRD-011");
  playAction(state, "P1", overtime, { WORKER: [worker] });
  assert(state.cards[worker].maxAttacks === 2, "Overtime should grant a second attack");
  advancePhase(state, "P1");
  declareAttack(state, "P1", worker, null);
  declareAttack(state, "P1", worker, null);
  assert(state.players.P2.reputation === 18, "Two 1-Power attacks should deal 2 total Reputation damage");
  advancePhase(state, "P1");
  assert(state.players.P1.archive.includes(worker), "Worker should be Archived when End Phase begins after attacking twice");
});

test("Promotion Archives materials without destroying them and plays Plant Manager in Onboarding", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 30 }, { definitionId: "PRD-008", copies: 10 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const w1 = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", w1, 0);
  const w2 = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", w2, 1);
  const manager = forceToHand(state, "P1", "PRD-008");
  const destroyedBefore = state.eventLog.filter((e) => e.type === "EMPLOYEE_DESTROYED").length;
  playEmployee(state, "P1", manager, 0, [w1, w2]);
  assert(state.players.P1.archive.includes(w1) && state.players.P1.archive.includes(w2), "Promotion materials should go to Archive");
  assert(state.players.P1.employeeField[0] === manager, "Plant Manager should occupy the freed slot");
  assert(state.cards[manager].onboarding, "Promoted Employee should enter Onboarding");
  assert(state.cards[manager].lastPlayMethod === "PROMOTION", "Play method should be PROMOTION");
  assert(state.eventLog.filter((e) => e.type === "EMPLOYEE_DESTROYED").length === destroyedBefore, "Promotion materials must not count as destroyed");
});

test("Approval Required can make the opponent pay 1 Capacity and then lets the Action resolve", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-007", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "N-007", copies: 20 }]
  );
  toMain(state, "P1");
  const approval = forceToHand(state, "P1", "OFC-007");
  setIncident(state, "P1", approval, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const employee = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", employee, 0);
  const takeout = forceToHand(state, "P2", "N-007");
  playActionInteractive(state, "P2", takeout, { TARGETS: [employee] });
  assert(getAvailableIncidentResponses(state, "P1").some((x) => x.sourceId === approval), "Approval Required should respond to a printed cost 2 Action");
  activateIncident(state, "P1", approval, "OFC-007-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.pendingChoice?.playerId === "P2", "Action controller should receive the approval choice");
  const before = state.players.P2.availableCapacity;
  resolveChoice(state, "P2", state.pendingChoice!.id, "PAY");
  assert(state.players.P2.availableCapacity === before - 1, "PAY option should spend 1 additional Capacity");
  assert(getCurrentPower(state, employee) === 3, "Original Action should resolve after approval is paid");
  assert(state.players.P2.archive.includes(takeout), "Resolved Action should enter Archive");
});

test("Approval Required can delay an Action until the start of its controller's next Main Phase", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-007", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "N-007", copies: 20 }]
  );
  toMain(state, "P1");
  const approval = forceToHand(state, "P1", "OFC-007");
  setIncident(state, "P1", approval, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const employee = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", employee, 0);
  const takeout = forceToHand(state, "P2", "N-007");
  playActionInteractive(state, "P2", takeout, { TARGETS: [employee] });
  activateIncident(state, "P1", approval, "OFC-007-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");
  resolveChoice(state, "P2", state.pendingChoice!.id, "DELAY");
  assert(state.cards[takeout].zone === "PENDING", "Delayed Action should remain in PENDING");
  assert(getCurrentPower(state, employee) === 2, "Delayed Action must not resolve immediately");
  assert(state.pendingResolutions.length === 1, "A pending resolution should be scheduled");

  finishTurn(state, "P2");
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  assert(getCurrentPower(state, employee) === 3, "Delayed Action should resolve as the next Main Phase begins");
  assert(state.players.P2.archive.includes(takeout), "Delayed Action should Archive after its pending resolution");
});


test("pending player choices block normal game commands", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-007", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "N-007", copies: 20 }]
  );
  toMain(state, "P1");
  const approval = forceToHand(state, "P1", "OFC-007");
  setIncident(state, "P1", approval, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const employee = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", employee, 0);
  const takeout = forceToHand(state, "P2", "N-007");
  playActionInteractive(state, "P2", takeout, { TARGETS: [employee] });
  activateIncident(state, "P1", approval, "OFC-007-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(Boolean(state.pendingChoice), "Expected an unresolved approval choice");
  assertThrows(() => advancePhase(state, "P2"), /pending choice/, "Normal commands should be blocked during a choice");
});

test("Approval Required only exposes DELAY when the triggering player cannot pay extra Capacity", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-007", copies: 20 }, { definitionId: "CS-001", copies: 20 }],
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "N-007", copies: 20 }]
  );
  toMain(state, "P1");
  const approval = forceToHand(state, "P1", "OFC-007");
  setIncident(state, "P1", approval, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 2;
  const employee = forceToHand(state, "P2", "IT-001");
  // Put the Employee on field without spending the Action budget for this focused test.
  state.players.P2.availableCapacity = 10;
  playEmployee(state, "P2", employee, 0);
  const takeout = forceToHand(state, "P2", "N-007");
  state.players.P2.availableCapacity = 2;
  playActionInteractive(state, "P2", takeout, { TARGETS: [employee] });
  assert(state.players.P2.availableCapacity === 0, "Action should leave no Capacity available");
  activateIncident(state, "P1", approval, "OFC-007-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");
  const options = state.pendingChoice?.options.map((x) => x.id) ?? [];
  assert(options.length === 1 && options[0] === "DELAY", "Only DELAY should be offered when PAY is illegal");
});


// v0.5 redirects, trigger queue, Breakthrough, and cost pipeline ----------------
import { activateResponse, getAvailableResponses, getCardCost, getLegalActions } from "../src/engine.js";

test("System Administrator reduces only the first IT System cost each turn", () => {
  const state = mixedMatch(
    [{ definitionId: "IT-003", copies: 10 }, { definitionId: "IT-014", copies: 30 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const sysadmin = forceToHand(state, "P1", "IT-003");
  playEmployee(state, "P1", sysadmin, 0);
  const cluster1 = forceToHand(state, "P1", "IT-014");
  assert(getCardCost(state, "P1", cluster1, "PLAY").finalCost === 2, "First IT System should be reduced from 3 to 2");
  const before = state.players.P1.availableCapacity;
  playSystem(state, "P1", cluster1, 0);
  assert(state.players.P1.availableCapacity === before - 2, "First System should pay reduced cost");
  const cluster2 = forceToHand(state, "P1", "IT-014");
  assert(getCardCost(state, "P1", cluster2, "PLAY").finalCost === 3, "Second IT System should use printed cost after modifier is consumed");
});

test("Process Manager reduces the first Process Incident Set Cost", () => {
  const state = mixedMatch(
    [{ definitionId: "OFC-004", copies: 10 }, { definitionId: "OFC-007", copies: 30 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const manager = forceToHand(state, "P1", "OFC-004");
  playEmployee(state, "P1", manager, 0);
  const approval1 = forceToHand(state, "P1", "OFC-007");
  assert(getCardCost(state, "P1", approval1, "SET").finalCost === 1, "First Process card should be 1 cheaper to set");
  setIncident(state, "P1", approval1, 0);
  const approval2 = forceToHand(state, "P1", "OFC-007");
  assert(getCardCost(state, "P1", approval2, "SET").finalCost === 2, "Second Process card should no longer be reduced");
});

test("Call Dodged redirects an attack to another legal Employee", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "CS-011", copies: 10 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const first = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", first, 0);
  const second = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", second, 1);
  const dodge = forceToHand(state, "P1", "CS-011");
  setIncident(state, "P1", dodge, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  const attacker = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", attacker, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  advancePhase(state, "P2");

  declareAttackInteractive(state, "P2", attacker, first);
  const dodgeLegal = getLegalActions(state, "P1").responseOptions.find((x) => x.sourceId === dodge)!;
  assert(!dodgeLegal.targetChoices[0].candidateIds.includes(first), "Call Dodged must not offer the current attack target as a redirect target");
  activateIncident(state, "P1", dodge, "CS-011-A1", { NEW_TARGET: [second] });
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P1.employeeField.includes(first), "Original target should survive after redirect");
  assert(state.players.P1.archive.includes(second), "Redirected equal-Power defender should be destroyed");
  assert(state.players.P2.archive.includes(attacker), "Attacker should battle the redirected target");
  assert(state.eventLog.some((e) => e.type === "ATTACK_TARGET_REDIRECTED"), "Expected attack redirect event");
});

test("Wrong Department retargets a Chain Item but preserves original target legality", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 30 }, { definitionId: "CS-012", copies: 10 }],
    [{ definitionId: "IT-001", copies: 20 }, { definitionId: "N-006", copies: 20 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const first = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", first, 0);
  const second = forceToHand(state, "P1", "CS-001");
  playEmployee(state, "P1", second, 1);
  const wrong = forceToHand(state, "P1", "CS-012");
  setIncident(state, "P1", wrong, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  state.players.P2.availableCapacity = 10;
  const lunch = forceToHand(state, "P2", "N-006");
  playActionInteractive(state, "P2", lunch, { TARGET_1: [first] });
  const wrongLegal = getLegalActions(state, "P1").responseOptions.find((x) => x.sourceId === wrong)!;
  assert(!wrongLegal.targetChoices[0].candidateIds.includes(first), "Wrong Department must not offer the current Chain target as the new target");
  activateIncident(state, "P1", wrong, "CS-012-A1", { NEW_TARGET: [second] });
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(getCurrentPower(state, first) === 2, "Original target should remain unchanged");
  assert(getCurrentPower(state, second) === 1, "Legal redirected target should receive the effect");
  assert(state.eventLog.some((e) => e.type === "CHAIN_TARGET_REDIRECTED"), "Expected Chain target redirect event");
});

test("Customer Advocate can respond from the field and redirect an attack to itself", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 20 }, { definitionId: "CS-005", copies: 20 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const agent = forceToHand(state, "P1", "CS-001");
  const advocate = forceToHand(state, "P1", "CS-005");
  playEmployee(state, "P1", agent, 0);
  playEmployee(state, "P1", advocate, 1);
  finishTurn(state, "P1");
  toMain(state, "P2");
  const attacker = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", attacker, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  advancePhase(state, "P2");
  declareAttackInteractive(state, "P2", attacker, agent);
  const responses = getAvailableResponses(state, "P1");
  assert(responses.some((x) => x.sourceId === advocate && x.abilityId === "CS-005-A1"), "Customer Advocate should be an in-play response");
  activateResponse(state, "P1", advocate, "CS-005-A1");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P1.employeeField.includes(agent), "Protected Employee should survive");
  assert(state.players.P1.employeeField.includes(advocate), "3-Power Advocate should survive redirected battle");
  assert(state.players.P2.archive.includes(attacker), "2-Power attacker should be destroyed by Advocate");
});

test("Ticket Specialist queues a draw trigger when a Ticket returns another Employee from Archive", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-003", copies: 10 }, { definitionId: "CS-001", copies: 15 }, { definitionId: "CS-008", copies: 15 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const specialist = forceToHand(state, "P1", "CS-003");
  playEmployee(state, "P1", specialist, 0);
  const agent = forceToArchive(state, "P1", "CS-001");
  const reopen = forceToHand(state, "P1", "CS-008");
  const handBefore = state.players.P1.hand.length;
  playActionInteractive(state, "P1", reopen, { TARGET_1: [agent] });
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.chain.length === 1 && state.chain[0].sourceInstanceId === specialist, "Ticket Specialist trigger should open a new Chain");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P1.hand.length === handBefore, "Reopen left hand, then Specialist should draw one replacement card");
  assert(state.eventLog.some((e) => e.type === "TRIGGER_QUEUED" && e.cardInstanceId === specialist), "Expected queued Ticket Specialist trigger");
});

test("a Ticket Specialist revived by Ticket Reopened does not trigger from its own return", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-003", copies: 20 }, { definitionId: "CS-008", copies: 20 }],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const specialist = forceToArchive(state, "P1", "CS-003");
  const reopen = forceToHand(state, "P1", "CS-008");
  playActionInteractive(state, "P1", reopen, { TARGET_1: [specialist] });
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.responseWindow === null, "Revived Ticket Specialist must not create a trigger Chain from its own return");
  assert(!state.eventLog.some((e) => e.type === "TRIGGER_QUEUED" && e.cardInstanceId === specialist), "Trigger Presence Rule should prevent self-triggering on entry");
});

test("Performance Marketer reacts to Marketing Reputation loss through the Trigger Queue", () => {
  const state = mixedMatch(
    [{ definitionId: "MKT-003", copies: 20 }, { definitionId: "MKT-012", copies: 20 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const performance = forceToHand(state, "P1", "MKT-003");
  playEmployee(state, "P1", performance, 0);
  const viral = forceToHand(state, "P1", "MKT-012");
  playActionInteractive(state, "P1", viral);
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P2.reputation === 18, "Going Viral should resolve for 2 before the trigger Chain");
  assert(state.chain.length === 1 && state.chain[0].sourceInstanceId === performance, "Performance Marketer trigger should be on the Chain");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P2.reputation === 17, "Performance Marketer should add 1 Reputation loss");
});

test("Plant Manager uses Battle Event excess Power as a once-per-turn Breakthrough-style trigger", () => {
  const state = mixedMatch(
    [{ definitionId: "PRD-001", copies: 15 }, { definitionId: "PRD-004", copies: 15 }, { definitionId: "PRD-008", copies: 10 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 30;
  const mat1 = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", mat1, 0);
  const mat2 = forceToHand(state, "P1", "PRD-001");
  playEmployee(state, "P1", mat2, 1);
  const plant = forceToHand(state, "P1", "PRD-008");
  playEmployee(state, "P1", plant, 0, [mat1, mat2]);
  const warehouse = forceToHand(state, "P1", "PRD-004");
  playEmployee(state, "P1", warehouse, 1);
  finishTurn(state, "P1");

  toMain(state, "P2");
  const defender = forceToHand(state, "P2", "CS-001");
  playEmployee(state, "P2", defender, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  advancePhase(state, "P1");
  assert(getCurrentPower(state, plant) === 6, "Plant Manager should not buff itself");
  assert(getCurrentPower(state, warehouse) === 3, "Plant Manager should buff another Production Employee during Battle");
  declareAttackInteractive(state, "P1", warehouse, defender);
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P2.archive.includes(defender), "Warehouse Worker should win the 3 vs 2 battle");
  assert(state.players.P2.reputation === 20, "Battle itself should not deal overflow without Breakthrough");
  assert(state.chain.length === 1 && state.chain[0].sourceInstanceId === plant, "Plant Manager battle trigger should open a Chain");
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.players.P2.reputation === 19, "Plant Manager should convert 1 excess Power into Reputation loss");
});


test("Campaign Manager reduces the first Campaign Action cost each turn", () => {
  const state = mixedMatch(
    [{ definitionId: "MKT-005", copies: 20 }, { definitionId: "MKT-012", copies: 20 }],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const manager = forceToHand(state, "P1", "MKT-005");
  playEmployee(state, "P1", manager, 0);
  const viral1 = forceToHand(state, "P1", "MKT-012");
  assert(getCardCost(state, "P1", viral1, "PLAY").finalCost === 2, "First Campaign Action should cost 1 less");
  playAction(state, "P1", viral1);
  const viral2 = forceToHand(state, "P1", "MKT-012");
  assert(getCardCost(state, "P1", viral2, "PLAY").finalCost === 3, "Second Campaign Action should use printed cost");
});

test("intrinsic Breakthrough converts battle excess Power into Reputation damage", () => {
  const definitions = {
    ...alphaDefinitions,
    "TEST-BREAK": {
      id: "TEST-BREAK", version: 1, name: "Breakthrough Tester", cardType: "EMPLOYEE" as const,
      department: "PRODUCTION" as const, rank: "STAFF" as const, cost: { play: 2 }, power: 4, keywords: ["BREAKTHROUGH" as const]
    }
  };
  const state = createMatch({
    matchId: "breakthrough",
    seed: 55,
    firstPlayerId: "P1",
    definitions,
    p1Deck: [{ definitionId: "TEST-BREAK", copies: 40 }],
    p2Deck: [{ definitionId: "CS-001", copies: 40 }]
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  toMain(state, "P1");
  const attacker = state.players.P1.hand[0];
  playEmployee(state, "P1", attacker, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  const defender = state.players.P2.hand[0];
  playEmployee(state, "P2", defender, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  advancePhase(state, "P1");
  declareAttack(state, "P1", attacker, defender);
  assert(state.players.P2.archive.includes(defender), "Defender should be destroyed");
  assert(state.players.P2.reputation === 18, "4 vs 2 with Breakthrough should deal 2 Reputation damage");
  assert(state.eventLog.some((e) => e.type === "BREAKTHROUGH_DAMAGE"), "Expected Breakthrough damage event");
});

// v0.6 data + deck manipulation tests --------------------------------------
import { loadCardDefinitions } from "../src/cards.js";
import { resolveDeckSelection } from "../src/engine.js";

function forceTopDefinitions(state: GameState, playerId: PlayerId, definitionsInDrawOrder: string[]): string[] {
  const player = state.players[playerId];
  const chosen: string[] = [];
  for (const definitionId of definitionsInDrawOrder) {
    let id = player.deck.find((candidate) => state.cards[candidate].definitionId === definitionId && !chosen.includes(candidate));
    if (!id) {
      id = player.hand.find((candidate) => state.cards[candidate].definitionId === definitionId && !chosen.includes(candidate));
      if (!id) throw new Error(`No ${definitionId} available to put on top`);
      player.hand = player.hand.filter((candidate) => candidate !== id);
      state.cards[id].zone = "DECK";
      state.cards[id].objectVersion += 1;
    } else {
      player.deck = player.deck.filter((candidate) => candidate !== id);
    }
    chosen.push(id);
  }
  // Deck draws with pop(); first item in requested draw order must be last.
  player.deck.push(...[...chosen].reverse());
  return chosen;
}

test("card definitions load from external JSON data", () => {
  const loaded = loadCardDefinitions();
  assert(loaded["N-014"]?.name === "Spreadsheet", "Spreadsheet should load from data/cards.json");
  assert(loaded["MKT-008"]?.abilities?.[0]?.type === "ACTIVATED", "JSON ability data should be typed and available");
  assert(Object.keys(loaded).length > 27, "v0.6 JSON catalog should extend the previous inline catalog");
});

test("Search Deck pauses for a legal selection, reveals the choice, moves it to hand, and shuffles", () => {
  const state = mixedMatch(
    [
      { definitionId: "CS-001", copies: 30 },
      { definitionId: "CS-006", copies: 4 },
      { definitionId: "CS-007", copies: 3 },
      { definitionId: "CS-016", copies: 3 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const action = forceToHand(state, "P1", "CS-016");
  const managerCandidate = state.players.P1.deck.find((id) => {
    const def = state.definitions[state.cards[id].definitionId];
    return def.department === "CUSTOMER_SERVICE" && (def.rank === "LEAD" || def.rank === "EXECUTIVE");
  });
  assert(managerCandidate, "Expected a management candidate in Deck");

  playAction(state, "P1", action);
  const pending = state.pendingDeckSelection;
  assert(pending?.mode === "SEARCH", "Search should create a pending deck selection");
  assert(pending?.candidateIds.includes(managerCandidate!), "Lead/Executive should be a legal search candidate");
  assert(state.players.P1.archive.includes(action) === false, "Search Action must remain pending until selection resolves");

  resolveDeckSelection(state, "P1", pending!.id, [managerCandidate!]);
  assert(state.players.P1.hand.includes(managerCandidate!), "Selected manager should move to hand");
  assert(state.players.P1.archive.includes(action), "Search Action should Archive after selection resolves");
  assert(state.eventLog.some((event) => event.type === "CARD_REVEALED" && event.cardInstanceId === managerCandidate), "Selected searched card should be revealed");
  assert(state.eventLog.some((event) => event.type === "DECK_SHUFFLED"), "Search should shuffle the Deck afterward");
});

test("Spreadsheet lets its controller choose which of the top two cards stays on top", () => {
  const state = mixedMatch(
    [
      { definitionId: "N-014", copies: 3 },
      { definitionId: "CS-001", copies: 19 },
      { definitionId: "N-006", copies: 18 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const spreadsheet = forceToHand(state, "P1", "N-014");
  playSystem(state, "P1", spreadsheet, 0);
  const [employeeTop, lunchSecond] = forceTopDefinitions(state, "P1", ["CS-001", "N-006"]);

  activateAbility(state, "P1", spreadsheet, "N-014-A1");
  const pending = state.pendingDeckSelection;
  assert(pending?.mode === "TOP", "Spreadsheet should open a top-deck selection");
  assert(pending?.visibleIds[0] === employeeTop && pending.visibleIds[1] === lunchSecond, "Top cards should be presented in draw order");

  resolveDeckSelection(state, "P1", pending!.id, [lunchSecond]);
  const deckNow = state.players.P1.deck;
  assert(deckNow[deckNow.length - 1] === lunchSecond, "Chosen Spreadsheet card should be the next card drawn");
  assert(deckNow[0] === employeeTop, "Other Spreadsheet card should move to the bottom");
  assertThrows(() => activateAbility(state, "P1", spreadsheet, "N-014-A1"), /usage limit/, "Spreadsheet should only be usable once per turn");
});

test("Last-Minute Briefing only allows Campaign or Content cards from the top three", () => {
  const state = mixedMatch(
    [
      { definitionId: "MKT-008", copies: 3 },
      { definitionId: "MKT-009", copies: 13 },
      { definitionId: "N-006", copies: 12 },
      { definitionId: "CS-001", copies: 12 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const briefing = forceToHand(state, "P1", "MKT-008");
  const [content, neutral, employee] = forceTopDefinitions(state, "P1", ["MKT-009", "N-006", "CS-001"]);

  playAction(state, "P1", briefing);
  const pending = state.pendingDeckSelection;
  assert(pending?.visibleIds.length === 3, "Briefing should look at exactly the top three cards");
  assert(pending?.candidateIds.length === 1 && pending.candidateIds[0] === content, "Only the Content card should be selectable");
  assertThrows(() => resolveDeckSelection(state, "P1", pending!.id, [neutral]), /legal candidate/, "A non-Campaign/Content card must not be selectable");

  resolveDeckSelection(state, "P1", pending!.id, [content], [neutral, employee]);
  assert(state.players.P1.hand.includes(content), "Selected Content card should be added to hand");
  assert(state.players.P1.archive.includes(briefing), "Briefing should Archive after deck selection");
  assert(state.players.P1.deck[0] === neutral && state.players.P1.deck[1] === employee, "Remaining cards should be placed on the bottom in the chosen order");
});

test("a pending deck selection blocks normal game commands", () => {
  const state = mixedMatch(
    [
      { definitionId: "MKT-008", copies: 4 },
      { definitionId: "MKT-009", copies: 36 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const briefing = forceToHand(state, "P1", "MKT-008");
  forceTopDefinitions(state, "P1", ["MKT-009", "MKT-009", "MKT-009"]);
  playAction(state, "P1", briefing);
  assert(state.pendingDeckSelection !== null, "Expected pending deck selection");
  assertThrows(() => advancePhase(state, "P1"), /deck selection/, "Phase advance should be blocked during deck selection");
});


test("interactive top-deck selection resumes and closes the same Chain Item", () => {
  const state = mixedMatch(
    [
      { definitionId: "MKT-008", copies: 4 },
      { definitionId: "MKT-009", copies: 36 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 10;
  const briefing = forceToHand(state, "P1", "MKT-008");
  const [content] = forceTopDefinitions(state, "P1", ["MKT-009", "MKT-009", "MKT-009"]);

  playActionInteractive(state, "P1", briefing);
  passPriority(state, "P2");
  passPriority(state, "P1");
  const pending = state.pendingDeckSelection;
  assert(pending !== null, "Chain resolution should pause for top-deck selection");
  assert(state.chain.length === 1, "Original Action Chain Item should remain while selection is pending");

  resolveDeckSelection(state, "P1", pending!.id, [content]);
  assert(state.chain.length === 0 && state.responseWindow === null, "Selection resolution should finish and close the Chain");
  assert(state.players.P1.archive.includes(briefing), "Interactive Action should Archive after its selection resolves");
  assert(state.players.P1.hand.includes(content), "Chosen Content card should be in hand");
});


test("battle payload reports both destroyed Employees on equal Power", () => {
  const state = readyMatch("P1");
  toMain(state, "P1");
  const p1 = state.players.P1.hand[0];
  playEmployee(state, "P1", p1, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  const p2 = state.players.P2.hand[0];
  playEmployee(state, "P2", p2, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  advancePhase(state, "P1");
  declareAttack(state, "P1", p1, p2);
  const battle = [...state.eventLog].reverse().find((event) => event.type === "BATTLE_RESOLVED");
  const destroyed = battle?.data?.destroyedIds as string[] | undefined;
  assert(destroyed?.includes(p1) && destroyed.includes(p2), "Tie battle payload should list both destroyed Employees");
});


// v0.7 tests ---------------------------------------------------------------
import { projectEventsSince, projectStateForViewer } from "../src/projection.js";
import type { CardDefinition } from "../src/types.js";

const testDestroyDefinition: CardDefinition = {
  id: "TEST-DESTROY",
  version: 1,
  name: "Test Destroy",
  cardType: "ACTION",
  department: "NEUTRAL",
  cost: { play: 1 },
  abilities: [{
    id: "TEST-DESTROY-A1",
    type: "ACTIVATED",
    timing: "OWN_MAIN_PHASE",
    targets: [{
      id: "TARGET_1",
      controller: "OPPONENT",
      zone: ["EMPLOYEE_FIELD", "SUPPORT_FIELD"],
      min: 1,
      max: 1,
      anyOf: [{ cardType: "EMPLOYEE" }, { cardType: "SYSTEM" }]
    }],
    effects: [{ type: "DESTROY_TARGET", target: "TARGET_1", cause: "CARD_EFFECT" }]
  }]
};

function customMatch(
  p1Deck: Array<{ definitionId: string; copies: number }>,
  p2Deck: Array<{ definitionId: string; copies: number }>,
  extra: Record<string, CardDefinition> = {}
) {
  const definitions = { ...alphaDefinitions, ...extra };
  const state = createMatch({
    matchId: "custom-v07",
    seed: 777,
    firstPlayerId: "P1",
    definitions,
    p1Deck,
    p2Deck
  });
  mulligan(state, "P1", []);
  mulligan(state, "P2", []);
  return state;
}

test("Turning It Off and On Again resets temporary Power changes", () => {
  const state = mixedMatch(
    [
      { definitionId: "IT-001", copies: 20 },
      { definitionId: "N-007", copies: 10 },
      { definitionId: "IT-010", copies: 10 }
    ],
    [{ definitionId: "CS-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const employee = forceToHand(state, "P1", "IT-001");
  playEmployee(state, "P1", employee, 0);
  const buff = forceToHand(state, "P1", "N-007");
  playAction(state, "P1", buff, { TARGETS: [employee] });
  assert(getCurrentPower(state, employee) === 3, "Employee should be temporarily buffed first");
  const reset = forceToHand(state, "P1", "IT-010");
  playAction(state, "P1", reset, { TARGET_1: [employee] });
  assert(getCurrentPower(state, employee) === 2, "Reset should remove temporary Power changes");
  assert(state.eventLog.some((event) => event.type === "CARD_RESET" && event.cardInstanceId === employee), "Expected CARD_RESET event");
});

test("Emergency Patch prevents a targeted card-effect destruction", () => {
  const state = customMatch(
    [{ definitionId: "TEST-DESTROY", copies: 40 }],
    [
      { definitionId: "IT-001", copies: 20 },
      { definitionId: "IT-012", copies: 20 }
    ],
    { "TEST-DESTROY": testDestroyDefinition }
  );
  // P1 passes first turn.
  toMain(state, "P1");
  finishTurn(state, "P1");
  // P2 establishes an IT Employee and a set Emergency Patch.
  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const employee = forceToHand(state, "P2", "IT-001");
  playEmployee(state, "P2", employee, 0);
  const patch = forceToHand(state, "P2", "IT-012");
  setIncident(state, "P2", patch, 0);
  finishTurn(state, "P2");
  // P1 tries to destroy the Employee.
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const destroy = forceToHand(state, "P1", "TEST-DESTROY");
  playActionInteractive(state, "P1", destroy, { TARGET_1: [employee] });
  const responses = getAvailableResponses(state, "P2");
  assert(responses.some((x) => x.sourceId === patch && x.abilityId === "IT-012-A1"), "Emergency Patch should be a legal response");
  activateResponse(state, "P2", patch, "IT-012-A1");
  passPriority(state, "P1");
  passPriority(state, "P2");
  assert(state.players.P2.employeeField.includes(employee), "Emergency Patch should keep the IT Employee on the field");
  assert(state.players.P2.archive.includes(patch), "Emergency Patch should Archive after resolving");
  assert(state.players.P1.archive.includes(destroy), "Destroy Action should still resolve and Archive");
  assert(state.eventLog.some((event) => event.type === "DESTRUCTION_PREVENTED" && event.cardInstanceId === employee), "Expected destruction prevention event");
});

test("Out of Office returns the targeted Customer Service Employee and makes destruction miss", () => {
  const state = customMatch(
    [{ definitionId: "TEST-DESTROY", copies: 40 }],
    [
      { definitionId: "CS-001", copies: 20 },
      { definitionId: "CS-018", copies: 20 }
    ],
    { "TEST-DESTROY": testDestroyDefinition }
  );
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const employee = forceToHand(state, "P2", "CS-001");
  playEmployee(state, "P2", employee, 0);
  const outOfOffice = forceToHand(state, "P2", "CS-018");
  setIncident(state, "P2", outOfOffice, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const destroy = forceToHand(state, "P1", "TEST-DESTROY");
  playActionInteractive(state, "P1", destroy, { TARGET_1: [employee] });
  activateResponse(state, "P2", outOfOffice, "CS-018-A1", { TARGET_1: [employee] });
  passPriority(state, "P1");
  passPriority(state, "P2");
  assert(state.players.P2.hand.includes(employee), "Out of Office should return the Employee to hand");
  assert(!state.players.P2.archive.includes(employee), "Original destroy effect should not destroy a target that left the field");
});

test("viewer projection hides opponent hand and face-down Incident identity", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 40 }],
    [
      { definitionId: "IT-001", copies: 20 },
      { definitionId: "IT-012", copies: 20 }
    ]
  );
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const incident = forceToHand(state, "P2", "IT-012");
  setIncident(state, "P2", incident, 0);
  const p1View = projectStateForViewer(state, "P1");
  const hidden = p1View.players.P2.supportField[0];
  assert(p1View.players.P2.hand.length === 0 && p1View.players.P2.handCount > 0, "Opponent hand contents must not be projected");
  assert(hidden !== null && hidden.definitionId === undefined, "Opponent face-down Incident must hide its definition");
  assert(hidden!.instanceId !== incident, "Opponent face-down Incident must not expose its stable server instance id");
  const p2View = projectStateForViewer(state, "P2");
  assert(p2View.players.P2.supportField[0]?.definitionId === "IT-012", "Controller should see their own set Incident");
  assert(p2View.players.P2.supportField[0]?.instanceId === incident, "Controller should receive the real instance id");
});

test("event projection redacts opponent draws and Incident sets", () => {
  const state = mixedMatch(
    [{ definitionId: "CS-001", copies: 40 }],
    [
      { definitionId: "IT-001", copies: 20 },
      { definitionId: "IT-012", copies: 20 }
    ]
  );
  toMain(state, "P1");
  finishTurn(state, "P1");
  toMain(state, "P2");
  // P2 draw has happened on the way to Main Phase.
  state.players.P2.availableCapacity = 20;
  const incident = forceToHand(state, "P2", "IT-012");
  setIncident(state, "P2", incident, 0);
  const p1Events = projectEventsSince(state, "P1", 0);
  const opponentDraw = p1Events.find((event) => event.type === "CARD_DRAWN" && event.playerId === "P2");
  const opponentSet = [...p1Events].reverse().find((event) => event.type === "INCIDENT_SET" && event.playerId === "P2");
  assert(opponentDraw !== undefined && opponentDraw.cardInstanceId === undefined, "Opponent draw event must not expose card id");
  assert(opponentSet !== undefined && opponentSet.cardInstanceId === undefined, "Opponent Incident set event must not expose card id");
});



test("Sick Leave replaces battle destruction and prevents Breakthrough", () => {
  const strong: CardDefinition = {
    id: "TEST-BREAKER",
    version: 1,
    name: "Test Breaker",
    cardType: "EMPLOYEE",
    department: "PRODUCTION",
    rank: "STAFF",
    cost: { play: 1 },
    power: 5,
    keywords: ["BREAKTHROUGH"]
  };
  const state = customMatch(
    [{ definitionId: "TEST-BREAKER", copies: 40 }],
    [
      { definitionId: "CS-001", copies: 20 },
      { definitionId: "N-011", copies: 20 }
    ],
    { "TEST-BREAKER": strong }
  );
  toMain(state, "P1");
  const attacker = forceToHand(state, "P1", "TEST-BREAKER");
  playEmployee(state, "P1", attacker, 0);
  finishTurn(state, "P1");

  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const defender = forceToHand(state, "P2", "CS-001");
  playEmployee(state, "P2", defender, 0);
  const sickLeave = forceToHand(state, "P2", "N-011");
  setIncident(state, "P2", sickLeave, 0);
  finishTurn(state, "P2");

  toMain(state, "P1");
  advancePhase(state, "P1");
  declareAttackInteractive(state, "P1", attacker, defender);
  // No attack-declaration response. Passing twice advances into the battle-destruction window.
  passPriority(state, "P2");
  passPriority(state, "P1");
  assert(state.responseWindow?.event === "BATTLE_DESTRUCTION_PENDING", "Expected battle destruction response window");
  const responses = getAvailableResponses(state, "P2");
  assert(responses.some((x) => x.sourceId === sickLeave && x.abilityId === "N-011-A1"), "Sick Leave should respond when own Employee would be destroyed by battle");
  activateResponse(state, "P2", sickLeave, "N-011-A1", { TARGET_1: [defender] });
  passPriority(state, "P1");
  passPriority(state, "P2");

  assert(state.players.P2.hand.includes(defender), "Sick Leave should return the Employee to hand");
  assert(!state.players.P2.archive.includes(defender), "Returned Employee should not be destroyed");
  assert(state.players.P2.reputation === 20, "Breakthrough must not apply when battle destruction was replaced");
  assert(state.players.P2.archive.includes(sickLeave), "Sick Leave should Archive after resolving");
  const battle = [...state.eventLog].reverse().find((event) => event.type === "BATTLE_RESOLVED");
  assert(Array.isArray(battle?.data?.destroyedIds) && (battle!.data!.destroyedIds as string[]).length === 0, "Battle should report no actual destroyed Employee");
});

test("Hotfix protects an IT System until the start of its controller's next turn", () => {
  const state = customMatch(
    [
      { definitionId: "IT-014", copies: 20 },
      { definitionId: "IT-018", copies: 20 }
    ],
    [{ definitionId: "TEST-DESTROY", copies: 40 }],
    { "TEST-DESTROY": testDestroyDefinition }
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const system = forceToHand(state, "P1", "IT-014");
  playSystem(state, "P1", system, 0);
  const hotfix = forceToHand(state, "P1", "IT-018");
  playAction(state, "P1", hotfix, { TARGET_1: [system] });
  assert(state.cards[system].destructionShields.length === 1, "Hotfix should add a destruction shield");
  finishTurn(state, "P1");

  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const destroy1 = forceToHand(state, "P2", "TEST-DESTROY");
  playAction(state, "P2", destroy1, { TARGET_1: [system] });
  assert(state.players.P1.supportField.includes(system), "Hotfix should prevent opponent card-effect destruction before next turn");
  finishTurn(state, "P2");

  // P1's next turn starts, so the Hotfix protection expires.
  toMain(state, "P1");
  assert(state.cards[system].destructionShields.length === 0, "Hotfix shield should expire at the start of the next own turn");
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const destroy2 = forceToHand(state, "P2", "TEST-DESTROY");
  playAction(state, "P2", destroy2, { TARGET_1: [system] });
  assert(state.players.P1.archive.includes(system), "System should be destroyable after Hotfix expires");
});



import { ALPHA_FORMAT, validateDeck } from "../src/engine.js";

test("Alpha deck validation enforces 40 cards, copy limits, and format-specific limits", () => {
  const ids = Object.keys(alphaDefinitions).slice(0, 14);
  assert(ids.length >= 14, "Need enough Alpha definitions for validation test");
  const valid = ids.slice(0, 13).map((definitionId) => ({ definitionId, copies: 3 }));
  valid.push({ definitionId: ids[13], copies: 1 });
  const ok = validateDeck(valid, alphaDefinitions, ALPHA_FORMAT);
  assert(ok.valid, `Expected legal 40-card Alpha deck: ${ok.errors.join(" ")}`);

  const copyViolation = validateDeck([{ definitionId: "CS-001", copies: 40 }], alphaDefinitions, ALPHA_FORMAT);
  assert(!copyViolation.valid && copyViolation.errors.some((x) => /maximum 3 copies/.test(x)), "Default copy limit should be 3");

  const limitedFormat = { ...ALPHA_FORMAT, id: "LIMIT-TEST", cardLimits: { [ids[0]]: 1 } };
  const limited = validateDeck(valid, alphaDefinitions, limitedFormat);
  assert(!limited.valid && limited.errors.some((x) => x.includes("maximum 1 copy")), "Format-specific Limited cards should override default copy limit");

  const forbiddenFormat = { ...ALPHA_FORMAT, id: "BAN-TEST", cardLimits: { [ids[0]]: 0 } };
  const forbidden = validateDeck(valid, alphaDefinitions, forbiddenFormat);
  assert(!forbidden.valid && forbidden.errors.some((x) => x.includes("Forbidden")), "Format-specific Forbidden cards should be rejected");
});

test("createMatch can enforce a supplied deck format", () => {
  assertThrows(() => createMatch({
    matchId: "illegal-format",
    seed: 1,
    firstPlayerId: "P1",
    definitions: alphaDefinitions,
    p1Deck: [{ definitionId: "CS-001", copies: 40 }],
    p2Deck: [{ definitionId: "IT-001", copies: 40 }],
    format: ALPHA_FORMAT
  }), /maximum 3 copies/, "createMatch should reject illegal decks when a format is supplied");
});

test("viewer projection exposes only currently legal own actions", () => {
  const state = mixedMatch(
    [
      { definitionId: "CS-001", copies: 14 },
      { definitionId: "N-006", copies: 13 },
      { definitionId: "CS-010", copies: 13 }
    ],
    [{ definitionId: "IT-001", copies: 40 }]
  );
  toMain(state, "P1");
  state.players.P1.availableCapacity = 20;
  const employee = forceToHand(state, "P1", "CS-001");
  const action = forceToHand(state, "P1", "N-006");
  const incident = forceToHand(state, "P1", "CS-010");
  const view = projectStateForViewer(state, "P1");
  assert(view.legalActions.playableEmployees.some((x) => x.cardId === employee), "Affordable Employee with field space should be legal");
  assert(view.legalActions.settableIncidents.some((x) => x.cardId === incident), "Affordable Incident with Support space should be legal to set");
  assert(!view.legalActions.playableActions.some((x) => x.cardId === action), "Targeted Action should not be offered without a legal opposing target");
  assert(view.legalActions.canAdvancePhase, "Active player should be able to advance phase");
});

test("legal-action projection reflects battle-destruction response priority", () => {
  const strong: CardDefinition = {
    id: "TEST-BREAKER-LEGAL",
    version: 1,
    name: "Test Breaker Legal",
    cardType: "EMPLOYEE",
    department: "PRODUCTION",
    rank: "STAFF",
    cost: { play: 1 },
    power: 5
  };
  const state = customMatch(
    [{ definitionId: "TEST-BREAKER-LEGAL", copies: 40 }],
    [
      { definitionId: "CS-001", copies: 20 },
      { definitionId: "N-011", copies: 20 }
    ],
    { "TEST-BREAKER-LEGAL": strong }
  );
  toMain(state, "P1");
  const attacker = forceToHand(state, "P1", "TEST-BREAKER-LEGAL");
  playEmployee(state, "P1", attacker, 0);
  finishTurn(state, "P1");
  toMain(state, "P2");
  state.players.P2.availableCapacity = 20;
  const defender = forceToHand(state, "P2", "CS-001");
  playEmployee(state, "P2", defender, 0);
  const sickLeave = forceToHand(state, "P2", "N-011");
  setIncident(state, "P2", sickLeave, 0);
  finishTurn(state, "P2");
  toMain(state, "P1");
  advancePhase(state, "P1");
  declareAttackInteractive(state, "P1", attacker, defender);
  passPriority(state, "P2");
  passPriority(state, "P1");
  const p2View = projectStateForViewer(state, "P2");
  const p1View = projectStateForViewer(state, "P1");
  assert(p2View.legalActions.canPassPriority, "Priority player should be able to pass");
  assert(p2View.legalActions.responseOptions.some((x) => x.sourceId === sickLeave), "Sick Leave should be projected as a legal response");
  assert(!p1View.legalActions.canPassPriority && p1View.legalActions.responseOptions.length === 0, "Non-priority player should not receive response actions");
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
console.log(`\n${passed}/${tests.length} tests passed.`);

