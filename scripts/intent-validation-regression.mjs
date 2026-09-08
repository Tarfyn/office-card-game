import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { alphaDefinitions } from "../dist/src/cards.js";
import { alphaDeckPresets } from "../dist/src/decks.js";
import { createMatch } from "../dist/src/engine.js";
import { executeMatchIntent, validateMatchIntent } from "../dist/src/intents.js";
import { RoomService } from "../dist/src/room.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const validIntents = [
  ["MULLIGAN", { type:"MULLIGAN", returnIds:[] }],
  ["ADVANCE_PHASE", { type:"ADVANCE_PHASE" }],
  ["ARCHIVE_EXCESS_HAND", { type:"ARCHIVE_EXCESS_HAND", cardIds:["CARD-1"] }],
  ["PLAY_EMPLOYEE", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:0, promotionMaterialIds:[] }],
  ["PLAY_SYSTEM", { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:0 }],
  ["SET_INCIDENT", { type:"SET_INCIDENT", cardId:"CARD-1", slot:0 }],
  ["PLAY_ACTION", { type:"PLAY_ACTION", cardId:"CARD-1", targets:{ target:["CARD-2"] } }],
  ["ACTIVATE_ABILITY", { type:"ACTIVATE_ABILITY", sourceId:"CARD-1", abilityId:"ABILITY", targets:{} }],
  ["ACTIVATE_RESPONSE", { type:"ACTIVATE_RESPONSE", sourceId:"CARD-1", abilityId:"ABILITY", targets:{} }],
  ["DECLARE_ATTACK", { type:"DECLARE_ATTACK", attackerId:"CARD-1", targetId:null }],
  ["PASS_PRIORITY", { type:"PASS_PRIORITY" }],
  ["RESOLVE_CHOICE", { type:"RESOLVE_CHOICE", choiceId:"CHOICE", optionId:"OPTION" }],
  ["RESOLVE_DECK_SELECTION", { type:"RESOLVE_DECK_SELECTION", selectionId:"SELECTION", selectedIds:[], orderedUnselectedIds:[] }],
  ["RESOLVE_TRIGGER_TARGET_SELECTION", { type:"RESOLVE_TRIGGER_TARGET_SELECTION", selectionId:"SELECTION", targets:{} }],
  ["RESOLVE_HAND_SELECTION", { type:"RESOLVE_HAND_SELECTION", selectionId:"SELECTION", selectedIds:[] }],
  ["COMPLETE_TUTORIAL", { type:"COMPLETE_TUTORIAL" }],
  ["RESIGN", { type:"RESIGN" }]
];
for (const [name, intent] of validIntents) {
  const result = validateMatchIntent(intent);
  assert.equal(result.ok, true, `${name} canonical shape must validate`);
}

const invalidCases = [
  ["unknown type", { type:"DO_SOMETHING_UNKNOWN" }],
  ["missing type", {}],
  ["null intent", null],
  ["employee fractional slot", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:1.5 }],
  ["employee negative slot", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:-1 }],
  ["employee out of range", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:999 }],
  ["employee string slot", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:"1" }],
  ["system fractional slot", { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:1.5 }],
  ["system negative slot", { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:-1 }],
  ["system out of range", { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:999 }],
  ["system string slot", { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:"1" }],
  ["incident fractional slot", { type:"SET_INCIDENT", cardId:"CARD-1", slot:1.5 }],
  ["incident negative slot", { type:"SET_INCIDENT", cardId:"CARD-1", slot:-1 }],
  ["incident out of range", { type:"SET_INCIDENT", cardId:"CARD-1", slot:999 }],
  ["incident string slot", { type:"SET_INCIDENT", cardId:"CARD-1", slot:"1" }],
  ["null id", { type:"PLAY_ACTION", cardId:null }],
  ["empty id", { type:"PLAY_ACTION", cardId:"" }],
  ["bad array", { type:"MULLIGAN", returnIds:["CARD-1", 4] }],
  ["bad target map", { type:"PLAY_ACTION", cardId:"CARD-1", targets:{ target:["CARD-1", 4] } }],
  ["bad selection array", { type:"RESOLVE_HAND_SELECTION", selectionId:"S", selectedIds:"CARD-1" }]
];
for (const [name, intent] of invalidCases) assert.equal(validateMatchIntent(intent).ok, false, `${name} must reject`);

const rawTargets = { target:["CARD-1"] };
const copiedTargets = validateMatchIntent({ type:"PLAY_ACTION", cardId:"CARD-1", targets:rawTargets });
assert.equal(copiedTargets.ok, true);
rawTargets.target.push("MUTATED_AFTER_VALIDATION");
assert.deepEqual(copiedTargets.intent.targets, { target:["CARD-1"] }, "validated target maps must be detached from raw input");
assert.equal(validateMatchIntent({ type:"PLAY_ACTION", cardId:"CARD-1" }).ok, true, "no-target Action remains valid");
assert.equal(validateMatchIntent({ type:"PLAY_ACTION", cardId:"CARD-1", targets:{ target:["CARD-2"] } }).ok, true, "single-target Action remains valid");
assert.equal(validateMatchIntent({ type:"PLAY_ACTION", cardId:"CARD-1", targets:{ employees:["CARD-2", "CARD-3"], supports:["CARD-4"] } }).ok, true, "multi-target Action remains valid");
const nonPlainTargetRecords = [
  ["Map", new Map([["target", ["CARD-1"]]])],
  ["Set", new Set(["CARD-1"])],
  ["Date", new Date(0)],
  ["RegExp", /target/],
  ["custom prototype", Object.assign(Object.create({ inherited:["CARD-1"] }), { target:["CARD-1"] })],
  ["custom class", new (class CustomRecord { constructor() { this.target = ["CARD-1"]; } })()],
  ["null prototype", Object.assign(Object.create(null), { target:["CARD-1"] })],
  ["empty key", { "": ["CARD-1"] }],
  ["__proto__ key", JSON.parse('{"__proto__":["CARD-1"]}')],
  ["constructor key", { constructor:["CARD-1"] }],
  ["prototype key", { prototype:["CARD-1"] }]
];
for (const [name, targets] of nonPlainTargetRecords) {
  assert.equal(validateMatchIntent({ type:"PLAY_ACTION", cardId:"CARD-1", targets }).ok, false, `${name} target map must reject`);
  assert.equal(validateMatchIntent({ type:"ACTIVATE_ABILITY", sourceId:"CARD-1", abilityId:"ABILITY", targets }).ok, false, `${name} ability target map must reject`);
  assert.equal(validateMatchIntent({ type:"ACTIVATE_RESPONSE", sourceId:"CARD-1", abilityId:"ABILITY", targets }).ok, false, `${name} response target map must reject`);
  assert.equal(validateMatchIntent({ type:"RESOLVE_TRIGGER_TARGET_SELECTION", selectionId:"S", targets }).ok, false, `${name} trigger target map must reject`);
}
assert.equal(({}).polluted, undefined, "target validation must not pollute Object.prototype");

const preset = alphaDeckPresets["customer-service-starter"];
const state = createMatch({ matchId:"F03-DIRECT", seed:73, firstPlayerId:"P1", definitions:alphaDefinitions, p1Deck:preset.cards, p2Deck:preset.cards });
const before = JSON.stringify(state);
for (const intent of [
  { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:1.5 },
  { type:"PLAY_SYSTEM", cardId:"CARD-1", slot:1.5 },
  { type:"SET_INCIDENT", cardId:"CARD-1", slot:1.5 },
  { type:"DO_SOMETHING_UNKNOWN" }
]) {
  const execution = executeMatchIntent(state, { intentId:"f03-direct", matchId:state.matchId, playerId:"P1", expectedStateVersion:state.stateVersion, intent });
  assert.equal(execution.response.accepted, false);
  assert.equal(execution.response.error?.code, "INVALID_INTENT");
  assert.equal(execution.response.stateVersion, state.stateVersion);
  assert.equal(JSON.stringify(execution.state), before);
}
assert.deepEqual(Object.keys(state.players.P1.employeeField), ["0", "1", "2", "3", "4"]);
assert.deepEqual(Object.keys(state.players.P1.supportField), ["0", "1", "2", "3"]);
assert.deepEqual(JSON.parse(JSON.stringify(state.players.P1.employeeField)), [null, null, null, null, null]);
assert.deepEqual(JSON.parse(JSON.stringify(state.players.P1.supportField)), [null, null, null, null]);
const gameplayInvalid = executeMatchIntent(state, { intentId:"f03-rule", matchId:state.matchId, playerId:"P1", expectedStateVersion:state.stateVersion, intent:{ type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:0 } });
assert.equal(gameplayInvalid.response.accepted, false);
assert.equal(gameplayInvalid.response.error?.code, "RULES_ERROR");
assert.equal(JSON.stringify(gameplayInvalid.state), before);

let persistenceWrites = 0;
let persistedSnapshot = null;
const rooms = new RoomService({ roomIdFactory:() => "F03ROOM", tokenFactory:(() => { let n=0; return () => `f03-token-${++n}`; })(), seedFactory:() => 73, nowFactory:() => 1000, persistence:{ storageLabel:"TEST_MEMORY", load:() => null, save:(snapshot) => { persistenceWrites += 1; persistedSnapshot = structuredClone(snapshot); } } });
const host = rooms.createRoom("customer-service-starter");
const guest = rooms.joinRoom(host.roomId, "it-starter", {}, { fixedSeed:73, fixedFirstPlayerId:"P1", forceOpeningDefinitionIds:["CS-014"], initialCapacity:12 });
for (const [seat, n] of [[host, 1], [guest, 2]]) {
  const token = seat.token;
  const view = rooms.getView(host.roomId, token);
  const result = rooms.submitIntent(host.roomId, token, { intentId:`f03-room-mulligan-${n}`, expectedStateVersion:view.match.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  assert.equal(result.response.accepted, true, `room setup mulligan ${n}`);
}
const roomBeforeSnapshot = rooms.snapshot();
const roomBefore = JSON.stringify(roomBeforeSnapshot);
const roomState = roomBeforeSnapshot.rooms[0].state;
const actionCardId = roomState.players.P1.hand.find((id) => roomState.cards[id]?.definitionId === "CS-014");
assert.ok(actionCardId, "CS-014 must be in the test hand");
const writesBeforeMalformed = persistenceWrites;
const malformedRoom = rooms.submitIntent(host.roomId, host.token, { intentId:"f03-room-map", expectedStateVersion:roomState.stateVersion, intent:{ type:"PLAY_ACTION", cardId:actionCardId, targets:new Map([["invalid", [4]]]) } });
assert.equal(malformedRoom.response.error?.code, "INVALID_INTENT");
assert.equal(JSON.stringify(rooms.snapshot()), roomBefore, "malformed Map target must not mutate the room snapshot");
assert.equal(persistenceWrites - writesBeforeMalformed, 0, "malformed Map target must not persist");
assert.deepEqual(Object.keys(roomState.players.P1.employeeField), ["0", "1", "2", "3", "4"]);
assert.deepEqual(Object.keys(roomState.players.P1.supportField), ["0", "1", "2", "3"]);
assert.equal(malformedRoom.response.events.length, 0, "malformed Map target must emit no gameplay events");
const validAction = rooms.submitIntent(host.roomId, host.token, { intentId:"f03-room-valid-action", expectedStateVersion:roomState.stateVersion, intent:{ type:"PLAY_ACTION", cardId:actionCardId, targets:{} } });
assert.equal(validAction.response.accepted, true, "valid Action must remain executable");
assert.equal(persistenceWrites - writesBeforeMalformed, 1, "valid accepted Action must persist normally");
assert.equal(persistedSnapshot.rooms[0].state.stateVersion, roomState.stateVersion + 1);

const runtimeDir = mkdtempSync(join(root, "f03-http-runtime-"));
const port = 8890 + (process.pid % 400);
const env = { ...process.env, NODE_ENV:"test", PORT:String(port), RUNTIME_DIR:runtimeDir, ROOM_STORE_PATH:join(runtimeDir,"rooms.json"), MATCHMAKING_STORE_PATH:join(runtimeDir,"matchmaking.json"), PLAYER_STORE_PATH:join(runtimeDir,"players.json"), PROFILE_STORE_PATH:join(runtimeDir,"profiles.json"), GUEST_CREDENTIAL_STORE_PATH:join(runtimeDir,"credentials.json"), PLAYTEST_FEEDBACK_STORE_PATH:join(runtimeDir,"feedback.json"), REQUIRE_HTTPS:"0" };
let child;
let inProcessServer = false;
let passed = false;
let logs = "";
try {
  if (process.platform === "win32") {
    Object.assign(process.env, env);
    await import(`../server/server.mjs?f03=${Date.now()}`);
    inProcessServer = true;
  } else {
    child = spawn(process.execPath, [join(root, "server", "server.mjs")], { cwd:root, env, stdio:["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { logs += String(chunk); });
    child.stderr.on("data", (chunk) => { logs += String(chunk); });
  }
  const base = `http://127.0.0.1:${port}`;
  for (let i=0; i<40; i += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    await delay(100);
  }
  const post = (path, body, token = "") => fetch(`${base}${path}`, { method:"POST", headers:{ "content-type":"application/json", ...(token ? { "x-room-token":token } : {}) }, body });
  const customDeck = { id:"f03-custom", name:"F03 Custom", cards:preset.cards };
  const created = await post("/api/rooms", JSON.stringify({ deck:customDeck }));
  if (created.status !== 201) console.error("create response", await created.text());
  assert.equal(created.status, 201, logs);
  const createdBody = await created.json();
  const joined = await post(`/api/rooms/${createdBody.roomId}/join`, JSON.stringify({ deck:customDeck }));
  assert.equal(joined.status, 200, logs);
  const joinedBody = await joined.json();
  const token = createdBody.token;
  const stateResponse = await fetch(`${base}/api/rooms/${createdBody.roomId}/state?token=${encodeURIComponent(token)}`);
  const stateBody = await stateResponse.json();
  const version = stateBody.match.stateVersion;
  const baseline = JSON.stringify(stateBody.match);
  const malformed = [
    ["fractional", { type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:1.5 }],
    ["unknown", { type:"DO_SOMETHING_UNKNOWN" }],
    ["missing", {}],
    ["null", null]
  ];
  for (const [label, intent] of malformed) {
    const response = await post(`/api/rooms/${createdBody.roomId}/intent`, JSON.stringify({ intentId:`f03-http-${label}`, expectedStateVersion:version, intent }), token);
    const body = await response.json();
    assert.equal(response.status, 400, `${label} HTTP status`);
    assert.equal(body.response?.error?.code, "INVALID_INTENT", `${label} HTTP code`);
    const after = await (await fetch(`${base}/api/rooms/${createdBody.roomId}/state?token=${encodeURIComponent(token)}`)).json();
    assert.equal(JSON.stringify(after.match), baseline, `${label} mutated room state`);
  }
  const ruleResponse = await post(`/api/rooms/${createdBody.roomId}/intent`, JSON.stringify({ intentId:"f03-http-rule", expectedStateVersion:version, intent:{ type:"PLAY_EMPLOYEE", cardId:"CARD-1", slot:0 } }), token);
  const ruleBody = await ruleResponse.json();
  assert.equal(ruleResponse.status, 409);
  assert.equal(ruleBody.response?.error?.code, "RULES_ERROR");
  const malformedJson = await post(`/api/rooms/${createdBody.roomId}/intent`, "{", token);
  const malformedJsonBody = await malformedJson.json();
  assert.equal(malformedJson.status, 400);
  assert.equal(malformedJsonBody.error?.code, "INVALID_JSON");
  passed = true;
  console.log("F03_INTENT_VALIDATION_OK · exhaustive shapes · no-mutation · direct RoomService · HTTP boundary");
} catch (error) {
  console.error("F03_INTENT_VALIDATION_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (child) child.kill("SIGTERM");
  await delay(100);
  rmSync(runtimeDir, { recursive:true, force:true });
  if (inProcessServer) process.exit(passed ? 0 : 1);
}
