import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomError, RoomService } from "../src/room.js";
let passed = 0;
function test(name, fn) { try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
}
catch (e) {
    console.error(`✗ ${name}`);
    throw e;
} }
function activeRoom() { let n = 0; const rooms = new RoomService({ roomIdFactory: () => "SES450", tokenFactory: () => `tok-${++n}`, seedFactory: () => 45, firstPlayerFactory: () => "P1", nowFactory: () => 1000 }); const h = rooms.createRoom("customer-service-starter"); const g = rooms.joinRoom(h.roomId, "it-starter"); return { rooms, h, g }; }
test("v4.5 a seat can claim one active browser controller", () => { const { rooms, h } = activeRoom(); const v = rooms.claimSeatClient(h.roomId, h.token, "client-primary-450"); assert.equal(v.viewerSession.protectionEnabled, true); assert.equal(v.viewerSession.isPrimary, true); assert.equal(v.viewerSession.activeElsewhere, false); });
test("v4.5 another tab sees read-only state instead of sharing move authority", () => { const { rooms, h } = activeRoom(); rooms.claimSeatClient(h.roomId, h.token, "client-a-450"); const v = rooms.getView(h.roomId, h.token, 0, "client-b-450"); assert.equal(v.viewerSession.isPrimary, false); assert.equal(v.viewerSession.activeElsewhere, true); });
test("v4.5 superseded clients cannot submit intents", () => { const { rooms, h } = activeRoom(); rooms.claimSeatClient(h.roomId, h.token, "client-a-450"); const v = rooms.getView(h.roomId, h.token); assert.throws(() => rooms.submitIntent(h.roomId, h.token, { clientId: "client-b-450", intentId: "blocked", expectedStateVersion: v.match.stateVersion, intent: { type: "RESIGN" } }), (e) => e instanceof RoomError && e.code === "SESSION_SUPERSEDED"); });
test("v4.5 explicit takeover transfers move authority", () => { const { rooms, h } = activeRoom(); rooms.claimSeatClient(h.roomId, h.token, "client-a-450"); rooms.claimSeatClient(h.roomId, h.token, "client-b-450"); const v = rooms.getView(h.roomId, h.token, 0, "client-b-450"); const r = rooms.submitIntent(h.roomId, h.token, { clientId: "client-b-450", intentId: "ok", expectedStateVersion: v.match.stateVersion, intent: { type: "RESIGN" } }); assert.equal(r.response.accepted, true); });
test("v4.5 legacy clients without client id remain compatible", () => { const { rooms, h } = activeRoom(); rooms.claimSeatClient(h.roomId, h.token, "client-a-450"); const v = rooms.getView(h.roomId, h.token); assert.equal(v.viewerSession.protectionEnabled, false); assert.equal(v.viewerSession.isPrimary, true); });
test("v4.5 server and client wire reconnect, resync and takeover UX while ranked timers remain off", () => { const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8"); const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8"); const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8"); const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8"); assert.match(server, /version: "4\.5\.0"/); assert.match(server, /session\\\/claim/); assert.match(app, /Take control here/); assert.match(app, /CLIENT_INSTANCE_ID/); assert.match(app, /Reconnecting…/); assert.match(css, /connection-banner\.superseded/); assert.match(html, /v4\.5 alpha playtest/i); const rooms = new RoomService({ roomIdFactory: () => "OFF450", tokenFactory: () => "off", nowFactory: () => 1000 }); const h = rooms.createRoom("customer-service-starter", { mode: "RANKED" }); assert.equal(h.view.settings.timerActive, false); });
console.log(`${passed}/6 v4.5 tests passed.`);
