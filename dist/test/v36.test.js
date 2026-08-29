import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAlphaMetaProfile } from "../src/economy.js";
import { MatchmakingQueue } from "../src/matchmaking.js";
import { PlayerProfileService } from "../src/profile.js";
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
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v3.6 guest profile service owns meta state behind a secret token", () => {
    const service = new PlayerProfileService({ idFactory: () => "profile-1", tokenFactory: () => "secret-1", nowFactory: () => 123 });
    const meta = createAlphaMetaProfile();
    meta.balances.OFFICE_CREDITS = 77;
    const created = service.create(meta, "QA Employee");
    assert.equal(created.profileToken, "secret-1");
    assert.equal(created.profile.profileId, "profile-1");
    assert.equal(created.profile.displayName, "QA Employee");
    assert.equal(service.get("secret-1").meta.balances.OFFICE_CREDITS, 77);
    const next = service.get("secret-1").meta;
    next.balances.SHREDDER_SCRAPS = 25;
    assert.equal(service.updateMeta("secret-1", next).meta.balances.SHREDDER_SCRAPS, 25);
});
test("v3.6 RoomService projects playtest names without exposing profile ids", () => {
    let token = 0;
    const rooms = new RoomService({ roomIdFactory: () => "ABC123", tokenFactory: () => `token-${++token}`, seedFactory: () => 7, firstPlayerFactory: () => "P1" });
    const host = rooms.createRoom("customer-service-starter", {}, { profileId: "private-host", displayName: "Alice" });
    const guest = rooms.joinRoom(host.roomId, "it-starter", { profileId: "private-guest", displayName: "Bob" });
    assert.equal(guest.view.hostDisplayName, "Alice");
    assert.equal(guest.view.guestDisplayName, "Bob");
    assert.equal(guest.view.profileId, undefined);
    assert.equal(rooms.getSeatIdentity(host.roomId, guest.token).profileId, "private-guest");
});
test("v3.6 matchmaking pairs oldest compatible queue entry and never self-matches", () => {
    let n = 0;
    const queue = new MatchmakingQueue({ ticketIdFactory: () => `t${++n}`, nowFactory: () => n });
    const a = queue.enqueue("p1", "FRIENDLY", { deck: "A" });
    assert.equal(a.opponent, null);
    const self = queue.enqueue("p1", "FRIENDLY", { deck: "A2" });
    assert.equal(self.ticket.ticketId, a.ticket.ticketId);
    const ranked = queue.enqueue("p2", "RANKED", { deck: "B" });
    assert.equal(ranked.opponent, null);
    const c = queue.enqueue("p3", "FRIENDLY", { deck: "C" });
    assert.equal(c.opponent?.profileId, "p1");
    queue.markMatched(a.ticket.ticketId, c.ticket.ticketId, { room: "R1" });
    queue.markMatched(c.ticket.ticketId, a.ticket.ticketId, { room: "R1" });
    assert.equal(queue.get(a.ticket.ticketId, "p1").status, "MATCHED");
});
test("v3.6 server exposes profile-owned economy and Quick Match endpoints", () => {
    assert.match(server, /new PlayerProfileService/);
    assert.match(server, /new MatchmakingQueue/);
    assert.match(server, /\/api\/profiles\/guest/);
    assert.match(server, /\/api\/profiles\/me/);
    assert.match(server, /\/api\/matchmaking\/enqueue/);
    assert.match(server, /\/api\/matchmaking\/status/);
    assert.match(server, /metaContext\(body\)/);
    assert.match(server, /PROFILE_MISMATCH/);
});
test("v3.6 client automatically restores a server profile and can queue Quick Match", () => {
    assert.match(app, /function ensureServerProfile\(\)/);
    assert.match(app, /SERVER_PROFILE_TOKEN_KEY/);
    assert.match(app, /function renderProfileStrip\(\)/);
    assert.match(app, /function beginQuickMatch\(\)/);
    assert.match(app, /id="quickMatchBtn"/);
    assert.match(app, /profileToken:state\.profileToken/);
    assert.match(css, /v3\.6 server playtest profile \+ quick matchmaking/);
});
test("v3.6 playtest profiles expose their storage mode rather than pretending to be production accounts", () => {
    assert.match(server, /storage:profiles\.storageLabel/);
    assert.match(app, /PLAYTEST PROFILE · SERVER/);
});
test("v3.6 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/7 v3.6 tests passed.`);
