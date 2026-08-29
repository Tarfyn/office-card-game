import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
}
function memoryPersistence() {
    let persisted = null;
    return {
        adapter: {
            storageLabel: "TEST_ROOMS",
            load: () => persisted ? structuredClone(persisted) : null,
            save: (snapshot) => { persisted = structuredClone(snapshot); }
        },
        snapshot: () => persisted ? structuredClone(persisted) : null
    };
}
test("v3.9 RoomService tracks SSE-style seat presence and action timestamps without enabling AFK forfeits", () => {
    let now = 1_000;
    const store = memoryPersistence();
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "LIFE39", tokenFactory: () => `life-${++tokenNo}`, seedFactory: () => 7, firstPlayerFactory: () => "P1", nowFactory: () => now, persistence: store.adapter });
    const host = rooms.createRoom("customer-service-starter", { mode: "FRIENDLY" }, { displayName: "Alice" });
    assert.equal(host.view.lifecycle.presence.P1.status, "DISCONNECTED");
    now = 1_100;
    const connection = rooms.connectSeat(host.roomId, host.token);
    let view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.lifecycle.presence.P1.status, "CONNECTED");
    assert.equal(view.lifecycle.presence.P1.lastSeenAt, 1_100);
    assert.equal(view.lifecycle.enforcement.autoForfeitEnabled, false);
    assert.equal(view.lifecycle.enforcement.afkTimeoutSeconds, null);
    now = 1_200;
    connection.disconnect();
    view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.lifecycle.presence.P1.status, "DISCONNECTED");
    assert.equal(view.lifecycle.presence.P1.disconnectedAt, 1_200);
});
test("v3.9 lifecycle survives restart but live connections correctly restore as disconnected", () => {
    let now = 2_000;
    const store = memoryPersistence();
    let tokenNo = 0;
    const first = new RoomService({ roomIdFactory: () => "RST939", tokenFactory: () => `rst-${++tokenNo}`, seedFactory: () => 8, firstPlayerFactory: () => "P1", nowFactory: () => now, persistence: store.adapter });
    const host = first.createRoom("customer-service-starter");
    first.connectSeat(host.roomId, host.token);
    now = 2_200;
    first.joinRoom(host.roomId, "it-starter");
    const before = first.getView(host.roomId, host.token, 0);
    assert.equal(before.lifecycle.matchStartedAt, 2_200);
    now = 3_000;
    const restarted = new RoomService({ nowFactory: () => now, persistence: store.adapter });
    const after = restarted.getView(host.roomId, host.token, 0);
    assert.equal(after.status, "ACTIVE");
    assert.equal(after.lifecycle.matchStartedAt, 2_200);
    assert.equal(after.lifecycle.presence.P1.status, "DISCONNECTED");
    assert.equal(after.lifecycle.presence.P1.disconnectedAt, 3_000);
});
test("v3.9 waiting private room can be explicitly abandoned and removed from persistence", () => {
    const store = memoryPersistence();
    const rooms = new RoomService({ roomIdFactory: () => "ABN939", tokenFactory: () => "host-token", nowFactory: () => 4_000, persistence: store.adapter });
    const host = rooms.createRoom("customer-service-starter");
    const result = rooms.abandonRoom(host.roomId, host.token);
    assert.equal(result.matchEnded, false);
    assert.equal(result.view, null);
    assert.equal(rooms.hasRoom(host.roomId), false);
    assert.equal(store.snapshot()?.rooms.length, 0);
});
test("v3.9 abandoning an active room is authoritative RESIGN rather than deleting match history state", () => {
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "RES939", tokenFactory: () => `res-${++tokenNo}`, seedFactory: () => 9, firstPlayerFactory: () => "P1", nowFactory: () => 5_000 });
    const host = rooms.createRoom("customer-service-starter");
    rooms.joinRoom(host.roomId, "it-starter");
    const result = rooms.abandonRoom(host.roomId, host.token);
    assert.equal(result.matchEnded, true);
    assert.equal(result.view?.status, "ENDED");
    assert.equal(result.view?.match?.reason, "RESIGN");
    assert.equal(result.view?.match?.winnerId, "P2");
    assert.equal(rooms.hasRoom(host.roomId), true);
});
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const settings = readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8");
test("v3.9 server wires presence to SSE and exposes abandon endpoint with timers still unenforced", () => {
    assert.match(server, /rooms\.connectSeat\(roomId, token\)/);
    assert.match(server, /presence\.disconnect\(\)/);
    assert.match(server, /\/abandon\$/);
    assert.match(server, /rooms\.abandonRoom/);
    assert.match(server, /version: "(?:3\.9\.0|4\.0\.0)"/);
    assert.match(settings, /"autoForfeitEnabled": false/);
    assert.match(settings, /"afkTimeoutSeconds": null/);
    assert.match(settings, /"reconnectGraceSeconds": null/);
});
test("v3.9 browser can park and resume a room token instead of destructive local leave", () => {
    assert.match(app, /RECENT_SESSION_KEY/);
    assert.match(app, /function parkSession\(\)/);
    assert.match(app, /function resumeRecentSession\(\)/);
    assert.match(app, /RESUMABLE SESSION/);
    assert.match(app, /renderPresencePill/);
    assert.match(app, /Abandon room/);
    assert.doesNotMatch(app, /saveSession\([^\n]+\);\n\s*saveSession\(/);
    assert.match(html, /(?:v3\.9|v4\.0) alpha playtest/);
    assert.match(html, /Back to lobby/);
});
console.log(`${passed}/6 v3.9 tests passed.`);
