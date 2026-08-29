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
            storageLabel: "TEST_ROOMS_V41",
            load: () => persisted ? structuredClone(persisted) : null,
            save: (snapshot) => { persisted = structuredClone(snapshot); }
        },
        snapshot: () => persisted ? structuredClone(persisted) : null,
        replace: (snapshot) => { persisted = structuredClone(snapshot); }
    };
}
function timerProfile(overrides = {}) {
    return { id: "TEST_TIMER", enabled: true, turnSeconds: 2, responseSeconds: 1, timeBankSeconds: 0, reconnectGraceSeconds: null, ...overrides };
}
function startActive(rooms) {
    const host = rooms.createRoom("customer-service-starter", {}, { displayName: "Alice" });
    const guest = rooms.joinRoom(host.roomId, "it-starter", { displayName: "Bob" });
    const hostView = rooms.getView(host.roomId, host.token, 0);
    rooms.submitIntent(host.roomId, host.token, { intentId: "m-h", expectedStateVersion: hostView.match.stateVersion, intent: { type: "MULLIGAN", returnIds: [] } });
    const guestView = rooms.getView(host.roomId, guest.token, 0);
    rooms.submitIntent(host.roomId, guest.token, { intentId: "m-g", expectedStateVersion: guestView.match.stateVersion, intent: { type: "MULLIGAN", returnIds: [] } });
    return { host, guest, view: rooms.getView(host.roomId, host.token, 0) };
}
test("v4.1 untimed matches collect decision telemetry without enabling enforcement", () => {
    const now = { value: 1_000 };
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "TEL410", tokenFactory: () => `tel-${++tokenNo}`, seedFactory: () => 41, firstPlayerFactory: () => "P1", nowFactory: () => now.value });
    const { host } = startActive(rooms);
    let view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.settings.timerActive, false);
    assert.equal(view.telemetry.currentDecision?.kind, "TURN");
    assert.equal(view.telemetry.currentDecision?.playerId, "P1");
    now.value = 3_500;
    view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.telemetry.currentDecision?.elapsedSeconds, 2.5);
    assert.equal(view.telemetry.decisions.P1.TURN.totalSeconds, 2.5);
});
test("v4.1 telemetry counts accepted and rejected human intents separately", () => {
    const now = { value: 2_000 };
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "INT410", tokenFactory: () => `int-${++tokenNo}`, seedFactory: () => 42, firstPlayerFactory: () => "P1", nowFactory: () => now.value });
    const host = rooms.createRoom("customer-service-starter");
    const guest = rooms.joinRoom(host.roomId, "it-starter");
    rooms.submitIntent(host.roomId, host.token, { intentId: "good", expectedStateVersion: 0, intent: { type: "MULLIGAN", returnIds: [] } });
    rooms.submitIntent(host.roomId, host.token, { intentId: "bad", expectedStateVersion: 999, intent: { type: "MULLIGAN", returnIds: [] } });
    const view = rooms.getView(host.roomId, guest.token, 0);
    assert.equal(view.telemetry.intentsAccepted.P1, 1);
    assert.equal(view.telemetry.intentsRejected.P1, 1);
    assert.equal(view.telemetry.diagnostics.filter((event) => event.type === "INTENT_ACCEPTED").length, 1);
    assert.equal(view.telemetry.diagnostics.filter((event) => event.type === "INTENT_REJECTED").length, 1);
});
test("v4.1 disconnect and reconnect telemetry measures offline duration without counting initial SSE connect as reconnect", () => {
    const now = { value: 5_000 };
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "REC410", tokenFactory: () => `rec-${++tokenNo}`, nowFactory: () => now.value });
    const host = rooms.createRoom("customer-service-starter");
    rooms.joinRoom(host.roomId, "it-starter");
    const connection = rooms.connectSeat(host.roomId, host.token);
    let view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.telemetry.reconnects.P1, 0);
    now.value = 6_000;
    connection.disconnect();
    now.value = 9_000;
    const reconnected = rooms.connectSeat(host.roomId, host.token);
    view = rooms.getView(host.roomId, host.token, 0);
    assert.equal(view.telemetry.disconnects.P1, 1);
    assert.equal(view.telemetry.reconnects.P1, 1);
    assert.equal(view.telemetry.disconnectedSeconds.P1, 3);
    assert.equal(view.telemetry.maxDisconnectSeconds.P1, 3);
    reconnected.disconnect();
});
test("v4.1 telemetry persists across restart and does not charge server downtime to decision time", () => {
    const now = { value: 1_000 };
    const store = memoryPersistence();
    let tokenNo = 0;
    const base = { tokenFactory: () => `per-${++tokenNo}`, seedFactory: () => 43, firstPlayerFactory: () => "P1", nowFactory: () => now.value, persistence: store.adapter };
    const first = new RoomService({ ...base, roomIdFactory: () => "PER410" });
    const { host } = startActive(first);
    now.value = 5_000;
    const before = first.getView(host.roomId, host.token, 0);
    first.submitIntent(host.roomId, host.token, { intentId: "advance", expectedStateVersion: before.match.stateVersion, intent: { type: "ADVANCE_PHASE" } });
    assert.ok(store.snapshot()?.rooms[0]?.telemetry);
    now.value = 100_000;
    const restarted = new RoomService({ ...base, roomIdFactory: () => "UNUSED" });
    const restored = restarted.getView(host.roomId, host.token, 0);
    assert.equal(restored.telemetry.currentDecision?.playerId, "P1");
    assert.equal(restored.telemetry.currentDecision?.elapsedSeconds, 0);
    assert.equal(restored.telemetry.decisions.P1.TURN.totalSeconds, 4);
    assert.ok(restored.telemetry.diagnostics.some((event) => event.type === "SERVER_RESTORED"));
});
test("v4.1 timeout enforcement emits persistent diagnostics and closes telemetry decision window", () => {
    const now = { value: 1_000 };
    let tokenNo = 0;
    const rooms = new RoomService({ roomIdFactory: () => "TO4110", tokenFactory: () => `to-${++tokenNo}`, seedFactory: () => 44, firstPlayerFactory: () => "P1", nowFactory: () => now.value, timerProfiles: [timerProfile({ turnSeconds: 1 })] });
    const host = rooms.createRoom("customer-service-starter", { timerProfileId: "TEST_TIMER" });
    const guest = rooms.joinRoom(host.roomId, "it-starter");
    rooms.submitIntent(host.roomId, host.token, { intentId: "m1", expectedStateVersion: 0, intent: { type: "MULLIGAN", returnIds: [] } });
    const guestView = rooms.getView(host.roomId, guest.token, 0);
    rooms.submitIntent(host.roomId, guest.token, { intentId: "m2", expectedStateVersion: guestView.match.stateVersion, intent: { type: "MULLIGAN", returnIds: [] } });
    now.value = 2_000;
    rooms.tickTimers();
    const ended = rooms.getView(host.roomId, host.token, 0);
    assert.equal(ended.status, "ENDED");
    assert.equal(ended.telemetry.currentDecision, null);
    assert.ok(ended.telemetry.diagnostics.some((event) => event.type === "TIMEOUT" && event.data?.reason === "TURN_TIMEOUT"));
    assert.ok(ended.telemetry.diagnostics.some((event) => event.type === "MATCH_ENDED"));
});
test("v4.1 telemetry and diagnostics are wired into server/client without changing shipped timer activation", () => {
    const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
    const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
    const room = readFileSync(fileURLToPath(new URL("../../src/room.ts", import.meta.url)), "utf8");
    assert.match(server, /version: "4\.1\.0"/);
    assert.match(app, /Match telemetry/);
    assert.match(app, /Server diagnostics/);
    assert.match(app, /liveTelemetryDecision/);
    assert.match(room, /projectRoomTelemetry/);
    const rooms = new RoomService({ roomIdFactory: () => "OFF411", tokenFactory: () => "off-token", nowFactory: () => 1000 });
    const host = rooms.createRoom("customer-service-starter", { mode: "RANKED" });
    assert.equal(host.view.settings.timerActive, false);
});
console.log(`${passed}/6 v4.1 tests passed.`);
