import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
let passed = 0;
function test(n, f) { try {
    f();
    passed++;
    console.log(`✓ ${n}`);
}
catch (e) {
    console.error(`✗ ${n}`);
    throw e;
} }
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
function endedService() { let room = 0, token = 0; const service = new RoomService({ roomIdFactory: () => `RM${++room}XYZ`, tokenFactory: () => `tok-${++token}`, seedFactory: () => 100 + room, firstPlayerFactory: () => "P1" }); const host = service.createRoom("customer-service-starter", { mode: "FRIENDLY" }); const guest = service.joinRoom(host.roomId, "it-starter"); const v = service.getView(host.roomId, host.token).match.stateVersion; service.submitIntent(host.roomId, host.token, { intentId: "resign", expectedStateVersion: v, intent: { type: "RESIGN" } }); return { service, host, guest }; }
test("v7.29 creates a separate rematch room and preserves the source room", () => { const { service, host } = endedService(); const rematch = service.rematchRoom(host.roomId, host.token); assert.notEqual(rematch.roomId, host.roomId); assert.equal(rematch.playerId, "P1"); assert.equal(rematch.view.status, "ACTIVE"); assert.equal(service.getView(host.roomId, host.token).status, "ENDED"); });
test("v7.29 both old seats converge on the same rematch room", () => { const { service, host, guest } = endedService(); const first = service.rematchRoom(host.roomId, host.token, { alternateFirstPlayer: true }); const second = service.rematchRoom(host.roomId, guest.token); assert.equal(second.roomId, first.roomId); assert.equal(second.playerId, "P2"); assert.equal(first.view.match?.firstPlayerId, "P2"); });
test("v7.29 server exposes the rematch endpoint", () => { assert.match(server, /\/rematch\$/); assert.match(server, /rooms\.rematchRoom/); assert.match(server, /alternateFirstPlayer/); });
test("v7.29 result flow exposes rematch change deck review and lobby routes", () => { assert.match(app, /Rematch/); assert.match(app, /Alternate opener/); assert.match(app, /Change deck/); assert.match(app, /Review match/); assert.match(app, /Back to lobby/); });
test("v7.29 rated flow explicitly returns to matchmaking instead of direct rematch", () => { assert.match(app, /Rated rematches return to matchmaking/); assert.match(app, /settings\?\.ratingActive/); assert.match(app, /Ready for another rated match/); });
test("v7.29 version markers are current", () => { assert.match(server, /version: "7\.29\.0"/); assert.match(html, /v7\.29 Alpha Playtest/i); });
console.log(`${passed}/6 v7.29 tests passed.`);
