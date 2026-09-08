import { strict as assert } from "node:assert";
import { RoomService, type RoomStoreSnapshot } from "../src/room.js";

let saved: RoomStoreSnapshot | null = null;
let roomCounter = 0;
let tokenCounter = 0;
const persistence = {
  storageLabel:"FILE_JSON_LOCAL",
  load:() => saved ? structuredClone(saved) : null,
  save:(snapshot:RoomStoreSnapshot) => { saved = structuredClone(snapshot); }
};
const options = {
  persistence,
  roomIdFactory:() => `SETTLE${++roomCounter}`,
  tokenFactory:() => `settle-token-${++tokenCounter}`,
  firstPlayerFactory:() => "P1" as const,
  nowFactory:() => 1000
};

const first = new RoomService(options);
const host = first.createRoom("customer-service-starter", { mode:"FRIENDLY" }, { profileId:"account-a", displayName:"A" });
const guest = first.joinRoom(host.roomId, "office-starter", { profileId:"account-b", displayName:"B" });
const view = first.getView(host.roomId, host.token, 0);
first.submitIntent(host.roomId, host.token, { intentId:"settlement-room-resign", expectedStateVersion:view.match!.stateVersion, intent:{ type:"RESIGN" } });
assert.equal(first.listPendingProfileCompletions().length, 1);

const restored = new RoomService(options);
const pending = restored.listPendingProfileCompletions();
assert.equal(pending.length, 1);
assert.equal(pending[0].settlementId, pending[0].completion.matchId);
restored.markProfileCompletionSettled(host.roomId, pending[0].settlementId);
assert.equal(restored.listPendingProfileCompletions().length, 0);
const restarted = new RoomService(options);
assert.equal(restarted.listPendingProfileCompletions().length, 0);
console.log("V7.69.74_SETTLEMENT_ROOM_RESTART_OK");
