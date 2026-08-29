import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService, type RoomStoreSnapshot } from "../src/room.js";
import type { TimerProfileConfig } from "../src/timers.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function memoryPersistence() {
  let persisted: RoomStoreSnapshot | null = null;
  return {
    adapter: {
      storageLabel:"TEST_ROOMS_V40",
      load:() => persisted ? structuredClone(persisted) : null,
      save:(snapshot:RoomStoreSnapshot) => { persisted = structuredClone(snapshot); }
    },
    snapshot:() => persisted ? structuredClone(persisted) : null,
    replace:(snapshot:RoomStoreSnapshot) => { persisted = structuredClone(snapshot); }
  };
}

function profile(overrides: Partial<TimerProfileConfig> = {}): TimerProfileConfig {
  return {
    id:"TEST_TIMER",
    enabled:true,
    turnSeconds:10,
    responseSeconds:3,
    timeBankSeconds:0,
    reconnectGraceSeconds:null,
    ...overrides
  };
}

function startActive(rooms: RoomService, nowRef: { value:number }) {
  let tokenNo = 0;
  // token factory is supplied by each test; this helper only progresses opening state.
  const host = rooms.createRoom("customer-service-starter", { mode:"FRIENDLY", timerProfileId:"TEST_TIMER" }, { displayName:"Alice" });
  const guest = rooms.joinRoom(host.roomId, "it-starter", { displayName:"Bob" });
  const hostBefore = rooms.getView(host.roomId, host.token, 0);
  rooms.submitIntent(host.roomId, host.token, { intentId:`m-h-${++tokenNo}`, expectedStateVersion:hostBefore.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  const guestBefore = rooms.getView(host.roomId, guest.token, 0);
  rooms.submitIntent(host.roomId, guest.token, { intentId:`m-g-${++tokenNo}`, expectedStateVersion:guestBefore.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  return { host, guest, view:rooms.getView(host.roomId, host.token, 0), nowRef };
}

test("v4.0 shipped Friendly/Ranked timer profiles stay inactive by default", () => {
  const rooms = new RoomService({ roomIdFactory:()=>"OFF400", tokenFactory:()=>"off-token", nowFactory:()=>1000 });
  const host = rooms.createRoom("customer-service-starter", { mode:"RANKED" });
  assert.equal(host.view.settings.timerActive, false);
  assert.equal(host.view.settings.timerProfileId, "RANKED_STANDARD_TBD");
  assert.equal(host.view.timer.active, false);
  assert.equal(host.view.timer.clock, null);
  assert.equal(host.view.lifecycle.enforcement.autoForfeitEnabled, false);
});

test("v4.0 active profile starts after mulligans and combines turn clock with time bank", () => {
  const now = { value:1000 };
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"CLK400", tokenFactory:()=>`clk-${++tokenNo}`, seedFactory:()=>40, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value, timerProfiles:[profile({ timeBankSeconds:5 })] });
  const host = rooms.createRoom("customer-service-starter", { timerProfileId:"TEST_TIMER" });
  const guest = rooms.joinRoom(host.roomId, "it-starter");
  assert.equal(guest.view.timer.clock, null, "opening mulligan is intentionally untimed");
  rooms.submitIntent(host.roomId, host.token, { intentId:"m1", expectedStateVersion:0, intent:{type:"MULLIGAN", returnIds:[]} });
  const afterOne = rooms.getView(host.roomId, guest.token, 0);
  rooms.submitIntent(host.roomId, guest.token, { intentId:"m2", expectedStateVersion:afterOne.match!.stateVersion, intent:{type:"MULLIGAN", returnIds:[]} });
  const active = rooms.getView(host.roomId, host.token, 0);
  assert.equal(active.timer.active, true);
  assert.equal(active.timer.clock?.kind, "TURN");
  assert.equal(active.timer.clock?.playerId, "P1");
  assert.equal(active.timer.clock?.deadlineAt, 16_000);
  assert.equal(active.timer.timeBankRemainingSeconds.P1, 5);
});

test("v4.0 expired turn clock authoritatively forfeits with TURN_TIMEOUT", () => {
  const now = { value:1000 };
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"TO4000", tokenFactory:()=>`to-${++tokenNo}`, seedFactory:()=>41, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value, timerProfiles:[profile({ turnSeconds:4 })] });
  const { host } = startActive(rooms, now);
  now.value = 4_999;
  assert.equal(rooms.tickTimers().length, 0);
  now.value = 5_000;
  const actions = rooms.tickTimers();
  assert.deepEqual(actions, [{ roomId:host.roomId, type:"TURN_TIMEOUT", playerId:"P1" }]);
  const ended = rooms.getView(host.roomId, host.token, 0);
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.match?.winnerId, "P2");
  assert.equal(ended.match?.reason, "TURN_TIMEOUT");
});

test("v4.0 response timeout auto-passes priority instead of forfeiting the match", () => {
  const now = { value:2000 };
  const store = memoryPersistence();
  let tokenNo = 0;
  const options = { roomIdFactory:()=>"RSP400", tokenFactory:()=>`rsp-${++tokenNo}`, seedFactory:()=>42, firstPlayerFactory:()=>"P1" as const, nowFactory:()=>now.value, timerProfiles:[profile({ turnSeconds:60, responseSeconds:3 })], persistence:store.adapter };
  const first = new RoomService(options);
  const { host, guest } = startActive(first, now);
  const snapshot = store.snapshot()!;
  const savedRoom = snapshot.rooms[0];
  savedRoom.state!.responseWindow = { event:"ATTACK_DECLARED", actorId:"P1", triggeringChainItemId:null };
  savedRoom.state!.priorityPlayerId = "P2";
  savedRoom.state!.consecutivePasses = 0;
  store.replace(snapshot);
  const restarted = new RoomService({ ...options, roomIdFactory:()=>"UNUSED" });
  const response = restarted.getView(host.roomId, guest.token, 0);
  assert.equal(response.timer.clock?.kind, "RESPONSE");
  assert.equal(response.timer.clock?.playerId, "P2");
  assert.equal(response.timer.clock?.deadlineAt, 5_000);
  now.value = 5_000;
  const actions = restarted.tickTimers();
  assert.deepEqual(actions, [{ roomId:host.roomId, type:"AUTO_PASS", playerId:"P2" }]);
  const after = restarted.getView(host.roomId, guest.token, 0);
  assert.equal(after.status, "ACTIVE");
  assert.equal(after.match?.priorityPlayerId, "P1");
  assert.equal(after.timer.clock?.kind, "RESPONSE");
  assert.equal(after.timer.clock?.deadlineAt, 8_000);
});

test("v4.0 reconnect grace can forfeit a disconnected seat only while opponent remains connected", () => {
  const now = { value:1000 };
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"REC400", tokenFactory:()=>`rec-${++tokenNo}`, seedFactory:()=>43, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value, timerProfiles:[profile({ turnSeconds:100, reconnectGraceSeconds:4 })] });
  const { host, guest } = startActive(rooms, now);
  const p1 = rooms.connectSeat(host.roomId, host.token);
  const p2 = rooms.connectSeat(host.roomId, guest.token);
  now.value = 1100;
  p2.disconnect();
  const disconnected = rooms.getView(host.roomId, host.token, 0);
  assert.equal(disconnected.timer.reconnectDeadlineAt.P2, 5100);
  now.value = 5100;
  const actions = rooms.tickTimers();
  assert.deepEqual(actions, [{ roomId:host.roomId, type:"RECONNECT_TIMEOUT", playerId:"P2" }]);
  assert.equal(rooms.getView(host.roomId, host.token, 0).match?.reason, "RECONNECT_TIMEOUT");
  p1.disconnect();
});

test("v4.0 timer checkpoints survive restart without charging server downtime and runtime is wired to server/UI", () => {
  const now = { value:1000 };
  const store = memoryPersistence();
  let tokenNo = 0;
  const base = { tokenFactory:()=>`persist-${++tokenNo}`, seedFactory:()=>44, firstPlayerFactory:()=>"P1" as const, nowFactory:()=>now.value, timerProfiles:[profile({ turnSeconds:20 })], persistence:store.adapter };
  const first = new RoomService({ ...base, roomIdFactory:()=>"PER400" });
  const { host } = startActive(first, now);
  now.value = 6000;
  assert.equal(first.checkpointTimers(), true);
  now.value = 50_000;
  const restarted = new RoomService({ ...base, roomIdFactory:()=>"UNUSED" });
  const restored = restarted.getView(host.roomId, host.token, 0);
  assert.equal(restored.timer.clock?.deadlineAt, 65_000, "15 seconds remain; restart downtime is not charged");

  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const settings = readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8");
  assert.match(server, /timerProfiles: matchSettings\.timerProfiles/);
  assert.match(server, /rooms\.tickTimers\(\)/);
  assert.match(server, /rooms\.checkpointTimers\(\)/);
  assert.match(server, /version: "4\.0\.0"/);
  assert.match(app, /function liveTimerText\(\)/);
  assert.match(app, /id="liveTimerStatus"/);
  assert.match(app, /data-reconnect-player/);
  assert.match(settings, /"runtimeImplemented": true/);
  assert.match(settings, /"enabled": false/);
});

console.log(`${passed}/6 v4.0 tests passed.`);
