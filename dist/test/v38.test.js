import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MatchmakingQueue } from "../src/matchmaking.js";
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
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v3.8 RoomService restores a waiting private room after restart", () => {
    let persisted = null;
    const persistence = {
        storageLabel: "TEST_ROOMS",
        load: () => persisted ? structuredClone(persisted) : null,
        save: (snapshot) => { persisted = structuredClone(snapshot); }
    };
    let tokenNo = 0;
    const first = new RoomService({ roomIdFactory: () => "ABC123", tokenFactory: () => `token-${++tokenNo}`, seedFactory: () => 7, firstPlayerFactory: () => "P1", persistence });
    const host = first.createRoom("customer-service-starter", { mode: "FRIENDLY" }, { profileId: "profile-a", displayName: "Alice" });
    assert.equal(host.view.status, "WAITING");
    const restarted = new RoomService({ roomIdFactory: () => "ZZZ999", tokenFactory: () => `token-${++tokenNo}`, seedFactory: () => 8, firstPlayerFactory: () => "P2", persistence });
    const restored = restarted.getView(host.roomId, host.token, 0);
    assert.equal(restored.status, "WAITING");
    assert.equal(restored.hostDisplayName, "Alice");
    const joined = restarted.joinRoom(host.roomId, "it-starter", { profileId: "profile-b", displayName: "Bob" });
    assert.equal(joined.view.status, "ACTIVE");
    assert.equal(restarted.storageLabel, "TEST_ROOMS");
});
test("v3.8 active match and processed intent cache survive RoomService restart", () => {
    let persisted = null;
    const persistence = {
        storageLabel: "TEST_ROOMS",
        load: () => persisted ? structuredClone(persisted) : null,
        save: (snapshot) => { persisted = structuredClone(snapshot); }
    };
    let tokenNo = 0;
    const first = new RoomService({ roomIdFactory: () => "ROOM38", tokenFactory: () => `r38-${++tokenNo}`, seedFactory: () => 11, firstPlayerFactory: () => "P1", persistence });
    const host = first.createRoom("office-starter", {}, { displayName: "Host" });
    const guest = first.joinRoom(host.roomId, "production-starter", { displayName: "Guest" });
    let hostView = first.getView(host.roomId, host.token, 0);
    assert.ok(hostView.match);
    const hostMulligan = first.submitIntent(host.roomId, host.token, { intentId: "host-keep", expectedStateVersion: hostView.match.stateVersion, intent: { type: "MULLIGAN", returnIds: [] } });
    assert.equal(hostMulligan.response.accepted, true);
    const guestView = first.getView(host.roomId, guest.token, 0);
    const guestMulligan = first.submitIntent(host.roomId, guest.token, { intentId: "guest-keep", expectedStateVersion: guestView.match.stateVersion, intent: { type: "MULLIGAN", returnIds: [] } });
    assert.equal(guestMulligan.response.accepted, true);
    hostView = first.getView(host.roomId, host.token, 0);
    assert.equal(hostView.match?.status, "ACTIVE");
    const request = { intentId: "persisted-resign", expectedStateVersion: hostView.match.stateVersion, intent: { type: "RESIGN" } };
    const original = first.submitIntent(host.roomId, host.token, request);
    assert.equal(original.response.accepted, true);
    const restarted = new RoomService({ persistence });
    const restored = restarted.getView(host.roomId, host.token, 0);
    assert.equal(restored.status, "ENDED");
    assert.equal(restored.match?.reason, "RESIGN");
    const replay = restarted.submitIntent(host.roomId, host.token, request);
    assert.equal(replay.replayed, true);
    assert.equal(replay.response.stateVersion, original.response.stateVersion);
});
test("v3.8 waiting Quick Match ticket survives queue restart and still matches", () => {
    let persisted = null;
    const persistence = {
        storageLabel: "TEST_MM",
        load: () => persisted ? structuredClone(persisted) : null,
        save: (snapshot) => { persisted = structuredClone(snapshot); }
    };
    let n = 0;
    const first = new MatchmakingQueue({ ticketIdFactory: () => `m${++n}`, nowFactory: () => n, persistence });
    const a = first.enqueue("profile-a", "FRIENDLY", { deck: "A" });
    assert.equal(a.opponent, null);
    const restarted = new MatchmakingQueue({ ticketIdFactory: () => `m${++n}`, nowFactory: () => n, persistence });
    assert.equal(restarted.get(a.ticket.ticketId, "profile-a").status, "WAITING");
    const b = restarted.enqueue("profile-b", "FRIENDLY", { deck: "B" });
    assert.equal(b.opponent?.ticketId, a.ticket.ticketId);
    assert.equal(restarted.storageLabel, "TEST_MM");
});
test("v3.8 matched Quick Match sessions persist as one pair", () => {
    let persisted = null;
    const persistence = {
        storageLabel: "TEST_MM",
        load: () => persisted ? structuredClone(persisted) : null,
        save: (snapshot) => { persisted = structuredClone(snapshot); }
    };
    let n = 0;
    const queue = new MatchmakingQueue({ ticketIdFactory: () => `p${++n}`, nowFactory: () => n, persistence });
    const a = queue.enqueue("a", "FRIENDLY", { deck: "A" }).ticket;
    const b = queue.enqueue("b", "FRIENDLY", { deck: "B" }).ticket;
    queue.markPairMatched(a.ticketId, { roomId: "R38", token: "ta" }, b.ticketId, { roomId: "R38", token: "tb" });
    const restarted = new MatchmakingQueue({ persistence });
    const restoredA = restarted.get(a.ticketId, "a");
    const restoredB = restarted.get(b.ticketId, "b");
    assert.equal(restoredA.status, "MATCHED");
    assert.equal(restoredB.status, "MATCHED");
    assert.equal(restoredA.session?.roomId, "R38");
    assert.equal(restoredB.matchedTicketId, a.ticketId);
});
test("v3.8 server persists rooms/matchmaking and reward claims no longer depend on RAM cache", () => {
    assert.match(server, /rooms\.local\.json/);
    assert.match(server, /matchmaking\.local\.json/);
    assert.match(server, /persistence: roomPersistence/);
    assert.match(server, /persistence: matchmakingPersistence/);
    assert.match(server, /matchmaking\.markPairMatched/);
    assert.match(server, /alreadyClaimed = \(context\.meta\.claimedRewardRooms/);
    assert.doesNotMatch(server, /rewardClaims = new Map/);
    assert.match(server, /version: "(?:3\.[89]\.0|4\.0\.0)"/);
});
test("v3.8 existing browser room session restore now benefits from persisted rooms", () => {
    assert.match(app, /const SESSION_KEY = 'office-card-game-v1-session'/);
    assert.match(app, /await refreshState\(\)/);
    assert.match(app, /startStream\(\)/);
    assert.match(html, /(?:v3\.[89]|v4\.0) alpha playtest/);
});
console.log(`${passed}/6 v3.8 tests passed.`);
