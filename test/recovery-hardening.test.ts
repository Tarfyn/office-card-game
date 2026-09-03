import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomError, RoomService, type RoomStoreSnapshot } from "../src/room.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function memoryPersistence() {
  let saved: RoomStoreSnapshot | null = null;
  return {
    adapter: {
      storageLabel:"RECOVERY_HARDENING",
      load:() => saved ? structuredClone(saved) : null,
      save:(snapshot:RoomStoreSnapshot) => { saved = structuredClone(snapshot); }
    },
    replace:(snapshot:RoomStoreSnapshot) => { saved = structuredClone(snapshot); }
  };
}

function activeRoom(persistence?: ReturnType<typeof memoryPersistence>["adapter"]) {
  let token = 0;
  const rooms = new RoomService({
    roomIdFactory:() => "RECOVERY46",
    tokenFactory:() => `recovery-token-${++token}`,
    seedFactory:() => 4646,
    firstPlayerFactory:() => "P1",
    nowFactory:() => 4_600,
    persistence
  });
  const host = rooms.createRoom("customer-service-starter", {}, { profileId:"recovery-p1", displayName:"Alice" });
  const guest = rooms.joinRoom(host.roomId, "it-starter", { profileId:"recovery-p2", displayName:"Bob" });
  const p1 = rooms.getView(host.roomId, host.token, 0);
  rooms.submitIntent(host.roomId, host.token, { intentId:"recovery-p1-mulligan", expectedStateVersion:p1.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  const p2 = rooms.getView(host.roomId, guest.token, 0);
  rooms.submitIntent(host.roomId, guest.token, { intentId:"recovery-p2-mulligan", expectedStateVersion:p2.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  return { rooms, host, guest };
}

test("restore keeps the same seat, phase, turn and projected hand", () => {
  const store = memoryPersistence();
  const first = activeRoom(store.adapter);
  const before = first.rooms.getView(first.host.roomId, first.host.token, 0);
  const restored = new RoomService({ persistence:store.adapter, nowFactory:() => 9_000 });
  const after = restored.getView(first.host.roomId, first.host.token, 0);
  assert.equal(after.playerId, before.playerId);
  assert.equal(after.match?.matchId, before.match?.matchId);
  assert.equal(after.match?.stateVersion, before.match?.stateVersion);
  assert.equal(after.match?.phase, before.match?.phase);
  assert.equal(after.match?.activePlayerId, before.match?.activePlayerId);
  assert.deepEqual(after.match?.players.P1.hand.map((card) => card.instanceId), before.match?.players.P1.hand.map((card) => card.instanceId));
  assert.equal(after.match?.players.P1.reputation, before.match?.players.P1.reputation);
  assert.ok(after.telemetry.diagnostics.some((event) => event.type === "SERVER_RESTORED"));
});

test("restore projects a persisted mandatory choice and response window without inventing local UI state", () => {
  const store = memoryPersistence();
  const first = activeRoom(store.adapter);
  const snapshot = store.adapter.load()!;
  const room = snapshot.rooms[0];
  room.state!.pendingChoice = { id:"choice-reconnect", playerId:"P1", chainItemId:"chain-1", sourceId:"card-1", controllerId:"P1", abilityId:"choose", triggeringChainItemId:null, targets:{}, targetObjectVersions:{}, options:[{ id:"one", effects:[] }] };
  room.state!.responseWindow = { event:"ATTACK_DECLARED", actorId:"P2", triggeringChainItemId:null };
  room.state!.priorityPlayerId = "P1";
  store.replace(snapshot);
  const restored = new RoomService({ persistence:store.adapter, nowFactory:() => 9_100 });
  const view = restored.getView(first.host.roomId, first.host.token, 0);
  assert.equal(view.match?.pendingChoice?.id, "choice-reconnect");
  assert.deepEqual(view.match?.pendingChoice?.options, ["one"]);
  assert.equal(view.match?.responseWindow?.event, "ATTACK_DECLARED");
  assert.equal(view.match?.priorityPlayerId, "P1");
});

test("reconnect is observational and does not advance the authoritative phase", () => {
  const first = activeRoom();
  const before = first.rooms.getView(first.host.roomId, first.host.token, 0);
  const connection = first.rooms.connectSeat(first.host.roomId, first.host.token, "reconnect-client");
  connection.disconnect();
  const reconnected = first.rooms.connectSeat(first.host.roomId, first.host.token, "reconnect-client");
  const after = first.rooms.getView(first.host.roomId, first.host.token, 0, "reconnect-client");
  assert.equal(after.match?.stateVersion, before.match?.stateVersion);
  assert.equal(after.match?.phase, before.match?.phase);
  assert.equal(after.lifecycle.presence.P1.status, "CONNECTED");
  reconnected.disconnect();
});

test("a retry after reconnect replays one accepted intent instead of advancing twice", () => {
  const first = activeRoom();
  first.rooms.claimSeatClient(first.host.roomId, first.host.token, "replay-client");
  const before = first.rooms.getView(first.host.roomId, first.host.token, 0, "replay-client");
  const request = { clientId:"replay-client", intentId:"advance-once", expectedStateVersion:before.match!.stateVersion, intent:{ type:"ADVANCE_PHASE" as const } };
  const original = first.rooms.submitIntent(first.host.roomId, first.host.token, request);
  const connection = first.rooms.connectSeat(first.host.roomId, first.host.token, "replay-client");
  connection.disconnect();
  first.rooms.connectSeat(first.host.roomId, first.host.token, "replay-client");
  const retry = first.rooms.submitIntent(first.host.roomId, first.host.token, request);
  assert.equal(original.response.accepted, true);
  assert.equal(retry.replayed, true);
  assert.equal(retry.response.stateVersion, original.response.stateVersion);
  assert.equal(retry.view.match?.stateVersion, original.view.match?.stateVersion);
});

test("a second tab can observe but cannot mutate until it explicitly takes control", () => {
  const { rooms, host } = activeRoom();
  rooms.claimSeatClient(host.roomId, host.token, "primary-tab");
  const observer = rooms.getView(host.roomId, host.token, 0, "second-tab");
  assert.equal(observer.viewerSession.activeElsewhere, true);
  assert.throws(() => rooms.submitIntent(host.roomId, host.token, { clientId:"second-tab", intentId:"blocked-tab", expectedStateVersion:observer.match!.stateVersion, intent:{ type:"ADVANCE_PHASE" } }), (error:unknown) => error instanceof RoomError && error.code === "SESSION_SUPERSEDED");
  rooms.claimSeatClient(host.roomId, host.token, "second-tab");
  const controlled = rooms.getView(host.roomId, host.token, 0, "second-tab");
  assert.equal(controlled.viewerSession.activeElsewhere, false);
});

test("the client hydrates historical events without replaying transient combat or movement cues", () => {
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  assert.match(app, /function appendEvents\(events = \[\], \{ present = true \} = \{\}\)/);
  assert.match(app, /const hydratingSession = !state\.view/);
  assert.match(app, /appendEvents\(view\.events, \{ present:!hydratingSession \}\)/);
  assert.match(app, /if \(!present\) return;/);
  assert.match(app, /state\.connectionStatus = 'RECOVERED'/);
  assert.match(app, /Connection restored\./);
});

test("the shipped recovery client owns one bounded reconnect path and keeps polling as safety sync", () => {
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  assert.match(app, /EventSource retries by itself\. Close it here/);
  assert.match(app, /function scheduleStreamReconnect/);
  assert.match(app, /function scheduleSyncPoll/);
  assert.match(app, /RECOVERY_NOTICE_DELAY_MS = 800/);
  assert.match(app, /state\.connectionStatus === 'RECOVERED'/);
});

test("recovery never enables the currently disabled Ranked timer or client-side forfeit", () => {
  const settings = readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  assert.match(settings, /"autoForfeitEnabled": false/);
  assert.match(settings, /"reconnectGraceSeconds": null/);
  assert.doesNotMatch(app, /setInterval\([^\n]*forfeit/);
});

console.log(`\n${passed}/${passed} recovery hardening tests passed.`);
