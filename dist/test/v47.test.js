import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MatchmakingQueue } from "../src/matchmaking.js";
import { PlayerProfileService } from "../src/profile.js";
import { DEFAULT_RANKED_CONFIG, ratingWindowForWait } from "../src/ranked.js";
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
function stores(initialPlayers = null) {
    let players = initialPlayers ? structuredClone(initialPlayers) : null;
    let credentials = null;
    return {
        playerPersistence: { storageLabel: "PLAYERS", load: () => players ? structuredClone(players) : null, save: (snapshot) => { players = structuredClone(snapshot); } },
        credentialPersistence: { storageLabel: "CREDS", load: () => credentials ? structuredClone(credentials) : null, save: (snapshot) => { credentials = structuredClone(snapshot); } },
        seedCredential: (profileToken, playerId) => { credentials = { version: 1, credentials: [{ kind: "GUEST_LOCAL", profileToken, playerId, createdAt: 1, lastUsedAt: 1 }] }; },
        readPlayers: () => players
    };
}
test("v4.7 ranked profiles start in placements and settle both ratings atomically", () => {
    let id = 0, token = 0;
    const service = new PlayerProfileService({ playerIdFactory: () => `p${++id}`, tokenFactory: () => `t${++token}`, nowFactory: () => 4700, rankedConfig: DEFAULT_RANKED_CONFIG });
    const a = service.create(undefined, "Alice");
    const b = service.create(undefined, "Bob");
    assert.equal(a.profile.ranked.status, "PLACEMENT");
    assert.equal(a.profile.ranked.rating, 1000);
    const settled = service.recordRankedMatch({ roomId: "RANK01", p1PlayerId: a.profile.playerId, p2PlayerId: b.profile.playerId, winnerPlayerId: a.profile.playerId, reason: "REPUTATION_ZERO", settledAt: 4710 });
    assert.equal(settled.replayed, false);
    assert.equal(settled.p1.rating, 1020);
    assert.equal(settled.p2.rating, 980);
    assert.equal(settled.p1.placementsPlayed, 1);
    assert.equal(settled.p1.wins, 1);
    assert.equal(settled.p2.losses, 1);
    assert.equal(service.recordRankedMatch({ roomId: "RANK01", p1PlayerId: a.profile.playerId, p2PlayerId: b.profile.playerId, winnerPlayerId: a.profile.playerId, reason: "REPUTATION_ZERO" }).replayed, true);
    assert.equal(service.get(a.profileToken).ranked.matchesPlayed, 1);
});
test("v4.7 five placement matches promote a profile to rated and resign losses stay separate", () => {
    let id = 0, token = 0, now = 100;
    const service = new PlayerProfileService({ playerIdFactory: () => `p${++id}`, tokenFactory: () => `t${++token}`, nowFactory: () => ++now });
    const a = service.create();
    const b = service.create();
    for (let i = 1; i <= 5; i++)
        service.recordRankedMatch({ roomId: `R${i}`, p1PlayerId: a.profile.playerId, p2PlayerId: b.profile.playerId, winnerPlayerId: i === 5 ? b.profile.playerId : a.profile.playerId, reason: i === 5 ? "RESIGN" : "REPUTATION_ZERO" });
    const ar = service.get(a.profileToken).ranked;
    const br = service.get(b.profileToken).ranked;
    assert.equal(ar.status, "RATED");
    assert.equal(ar.placementsPlayed, 5);
    assert.equal(ar.matchesPlayed, 5);
    assert.equal(ar.resignLosses, 1);
    assert.equal(br.status, "RATED");
});
test("v4.7 existing v4.6 player snapshots gain ranked defaults without losing player data", () => {
    const baseService = new PlayerProfileService({ playerIdFactory: () => "legacy-player", tokenFactory: () => "legacy-token" });
    const created = baseService.create(undefined, "Legacy Ranked QA");
    const legacyProfile = structuredClone(created.profile);
    delete legacyProfile.ranked;
    legacyProfile.meta.balances.OFFICE_CREDITS = 647;
    const st = stores({ version: 1, players: [legacyProfile] });
    st.seedCredential("legacy-token", "legacy-player");
    const restored = new PlayerProfileService({ playerPersistence: st.playerPersistence, credentialPersistence: st.credentialPersistence });
    const profile = restored.get("legacy-token");
    assert.equal(profile.meta.balances.OFFICE_CREDITS, 647);
    assert.equal(profile.ranked.rating, 1000);
    assert.equal(profile.ranked.status, "PLACEMENT");
    assert.equal(st.readPlayers()?.version, 1); // load alone is non-destructive; next write upgrades the snapshot
    restored.updateName("legacy-token", "Legacy Ranked QA 2");
    assert.equal(st.readPlayers()?.version, 2);
});
test("v4.7 ranked matchmaking prefers close MMR and widens while players wait", () => {
    let now = 0, seq = 0;
    const queue = new MatchmakingQueue({
        ticketIdFactory: () => `q${++seq}`,
        nowFactory: () => now,
        candidateScore: (ticket, candidate, currentNow) => {
            if (ticket.mode !== "RANKED")
                return 0;
            const diff = Math.abs(ticket.payload.rankedRating - candidate.payload.rankedRating);
            const waitMs = Math.max(0, currentNow - Math.min(ticket.createdAt, candidate.createdAt));
            return diff <= ratingWindowForWait(waitMs, DEFAULT_RANKED_CONFIG) ? diff : null;
        }
    });
    const low = queue.enqueue("low", "RANKED", { rankedRating: 1000 });
    assert.equal(low.opponent, null);
    const high = queue.enqueue("high", "RANKED", { rankedRating: 1400 });
    assert.equal(high.opponent, null);
    now = 60_000;
    assert.equal(queue.findOpponent(high.ticket.ticketId, "high")?.profileId, "low");
});
test("v4.7 only server-marked Ranked rooms are rating eligible; private Ranked rules stay unrated", () => {
    let room = 0, token = 0;
    const rooms = new RoomService({ roomIdFactory: () => `RR${++room}`, tokenFactory: () => `s${++token}`, seedFactory: () => 47, firstPlayerFactory: () => "P1" });
    const privateHost = rooms.createRoom("customer-service-starter", { mode: "RANKED" }, { profileId: "private-a" });
    const privateGuest = rooms.joinRoom(privateHost.roomId, "it-starter", { profileId: "private-b" });
    assert.equal(privateGuest.view.settings.ratingActive, undefined);
    rooms.abandonRoom(privateHost.roomId, privateGuest.token);
    assert.equal(rooms.listFinishedRankedResults().length, 0);
    const ratedHost = rooms.createRoom("customer-service-starter", { mode: "RANKED", ratingActive: true }, { profileId: "rated-a" });
    const ratedGuest = rooms.joinRoom(ratedHost.roomId, "it-starter", { profileId: "rated-b" });
    assert.equal(ratedGuest.view.settings.ratingActive, true);
    rooms.abandonRoom(ratedHost.roomId, ratedGuest.token);
    const results = rooms.listFinishedRankedResults();
    assert.equal(results.length, 1);
    assert.equal(results[0].winnerProfileId, "rated-a");
    assert.equal(results[0].reason, "RESIGN");
});
test("v4.7 server/client wire preseason rating while Ranked timer remains disabled", () => {
    const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
    const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
    const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8"));
    const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
    assert.match(server, /version: "4\.7\.0"/);
    assert.match(server, /recordRankedMatch/);
    assert.match(server, /ratingWindowForWait/);
    assert.match(server, /ratingActive:mode === "RANKED"/);
    assert.match(app, /RANKED ALPHA/);
    assert.match(app, /Placement/);
    assert.equal(settings.ranked.currentSeasonId, "ALPHA_PRESEASON");
    assert.equal(settings.ranked.enabled, true);
    assert.equal(settings.timerProfiles.find((p) => p.id === "RANKED_STANDARD_TBD").enabled, false);
    assert.match(html, /v4\.7 alpha playtest/i);
});
console.log(`${passed}/6 v4.7 tests passed.`);
