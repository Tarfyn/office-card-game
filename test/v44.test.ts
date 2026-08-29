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
  let persisted: RoomStoreSnapshot | null = null;
  return {
    adapter: {
      storageLabel:"TEST_ROOMS_V44",
      load:() => persisted ? structuredClone(persisted) : null,
      save:(snapshot:RoomStoreSnapshot) => { persisted = structuredClone(snapshot); }
    },
    snapshot:() => persisted ? structuredClone(persisted) : null
  };
}

function endedRoom(persistence?: ReturnType<typeof memoryPersistence>["adapter"]) {
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"REP440", tokenFactory:()=>`rep-token-${++tokenNo}`, seedFactory:()=>44, firstPlayerFactory:()=>"P1", nowFactory:()=>1_000, persistence });
  const host = rooms.createRoom("customer-service-starter", { mode:"FRIENDLY" }, { profileId:"profile-a", displayName:"Alice" });
  const guest = rooms.joinRoom(host.roomId, "it-starter", { profileId:"profile-b", displayName:"Bob" });
  const view = rooms.getView(host.roomId, host.token, 0);
  rooms.submitIntent(host.roomId, host.token, { intentId:"resign-v44", expectedStateVersion:view.match!.stateVersion, intent:{ type:"RESIGN" } });
  return { rooms, host, guest };
}

test("v4.4 ended matches expose a profile-bound replay with match summary, final state and timeline", () => {
  const { rooms, host } = endedRoom();
  const replay = rooms.getReplayForProfile(host.roomId, "profile-a");
  assert.equal(replay.version, "4.4");
  assert.equal(replay.viewerId, "P1");
  assert.equal(replay.mode, "FRIENDLY");
  assert.equal(replay.reason, "RESIGN");
  assert.equal(replay.winnerId, "P2");
  assert.equal(replay.host.displayName, "Alice");
  assert.equal(replay.guest?.displayName, "Bob");
  assert.equal(replay.finalState.status, "ENDED");
  assert.ok(replay.events.some((event) => event.type === "GAME_ENDED"));
});

test("v4.4 replay preserves live hidden-information redaction for the reviewing player", () => {
  const { rooms, host } = endedRoom();
  const replay = rooms.getReplayForProfile(host.roomId, "profile-a");
  const ownDraws = replay.events.filter((event) => event.type === "CARD_DRAWN" && event.playerId === "P1");
  const opponentDraws = replay.events.filter((event) => event.type === "CARD_DRAWN" && event.playerId === "P2");
  assert.equal(ownDraws.length, 5);
  assert.ok(ownDraws.every((event) => event.cardInstanceId && event.cardName && event.cardDefinitionId));
  assert.equal(opponentDraws.length, 5);
  assert.ok(opponentDraws.every((event) => !event.cardInstanceId && !event.cardName && !event.cardDefinitionId));
});

test("v4.4 replay access rejects profiles that were not seated in the room", () => {
  const { rooms, host } = endedRoom();
  assert.throws(() => rooms.getReplayForProfile(host.roomId, "profile-outsider"), (error: unknown) => error instanceof RoomError && error.code === "PROFILE_NOT_IN_ROOM");
});

test("v4.4 replay is unavailable before the match has ended", () => {
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"LIVE44", tokenFactory:()=>`live-token-${++tokenNo}`, seedFactory:()=>45 });
  const host = rooms.createRoom("customer-service-starter", {}, { profileId:"profile-live", displayName:"Live" });
  rooms.joinRoom(host.roomId, "it-starter", { profileId:"profile-other", displayName:"Other" });
  assert.throws(() => rooms.getReplayForProfile(host.roomId, "profile-live"), (error: unknown) => error instanceof RoomError && error.code === "REPLAY_NOT_AVAILABLE");
});

test("v4.4 replay survives room persistence and server-style restore", () => {
  const store = memoryPersistence();
  const { host } = endedRoom(store.adapter);
  assert.ok(store.snapshot()?.rooms.some((room) => room.id === host.roomId));
  const restored = new RoomService({ roomIdFactory:()=>"UNUSED", tokenFactory:()=>"unused", nowFactory:()=>50_000, persistence:store.adapter });
  const replay = restored.getReplayForProfile(host.roomId, "profile-a");
  assert.equal(replay.roomId, host.roomId);
  assert.equal(replay.reason, "RESIGN");
  assert.ok(replay.events.length >= 12);
  assert.ok(replay.telemetry.diagnostics.some((event) => event.type === "SERVER_RESTORED"));
});

test("v4.4 replay endpoints and Match History review UI are wired while shipped Ranked timers remain disabled", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
  assert.match(server, /version: "4\.4\.0"/);
  assert.match(server, /matches\\\/\(\[\^\/\]\+\)\\\/replay/);
  assert.match(server, /getReplayForProfile/);
  assert.match(app, /data-review-room/);
  assert.match(app, /MATCH REVIEW/);
  assert.match(app, /Export replay JSON/);
  assert.match(css, /replay-timeline/);
  assert.match(html, /v4\.4 alpha playtest/i);
  const rooms = new RoomService({ roomIdFactory:()=>"OFF440", tokenFactory:()=>"off-token", nowFactory:()=>1_000 });
  const host = rooms.createRoom("customer-service-starter", { mode:"RANKED" });
  assert.equal(host.view.settings.timerActive, false);
});

console.log(`${passed}/6 v4.4 tests passed.`);
