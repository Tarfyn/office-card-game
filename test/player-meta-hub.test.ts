import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { PlayerProfileService, type PlayerProfileStoreSnapshot } from "../src/profile.js";
import { RoomService } from "../src/room.js";

let passed = 0;
function test(name:string, fn:()=>void):void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test("player meta hub restores legacy flat PvP stats and an empty history safely", () => {
  const snapshot:PlayerProfileStoreSnapshot = {
    version:1,
    records:[{
      profileToken:"legacy-token",
      profile:{
        profileId:"legacy-player",
        displayName:"Legacy Employee",
        stats:{ matchesPlayed:4, wins:3, losses:1, draws:0, friendlyMatches:4, rankedMatches:0 },
        matchHistory:[]
      }
    }]
  };
  const service = new PlayerProfileService({
    persistence:{ storageLabel:"TEST", load:() => snapshot, save:() => {} }
  });
  const profile = service.get("legacy-token");
  assert.equal(profile.matchHistory.length, 0);
  assert.deepEqual(profile.stats.pvp, { matches:4, wins:3, losses:1, draws:0 });
  assert.equal(profile.stats.matchesPlayed, 4);
});

test("authoritative history records update competitive stats once and retain newest records", () => {
  const service = new PlayerProfileService({
    playerIdFactory:() => "meta-player",
    tokenFactory:() => "meta-token",
    nowFactory:() => 100,
    maxHistoryEntries:2
  });
  const created = service.create(undefined, "Meta Employee");
  service.recordMatch(created.profileToken, { roomId:"ROOM-1", matchId:"MATCH-1", mode:"FRIENDLY", outcome:"WIN", opponentName:"A", deckName:"CS Deck", opponentDeckName:"IT Deck", turns:4, reason:"REPUTATION_ZERO", finishedAt:100, primaryDepartment:"CS", selectedDeckId:"deck-cs" });
  service.recordMatch(created.profileToken, { roomId:"ROOM-2", matchId:"MATCH-2", mode:"TRAINING", outcome:"WIN", opponentName:"Bot", deckName:"CS Deck", opponentDeckName:"IT Deck", turns:2, reason:"REPUTATION_ZERO", finishedAt:101, primaryDepartment:"CS", selectedDeckId:"deck-cs" });
  service.recordMatch(created.profileToken, { roomId:"ROOM-3", matchId:"MATCH-3", mode:"FRIENDLY", outcome:"DRAW", opponentName:"B", deckName:"Mixed Deck", opponentDeckName:"IT Deck", turns:7, reason:"TURN_LIMIT", finishedAt:102, primaryDepartment:"MIXED", selectedDeckId:"deck-mixed" });
  const duplicate = service.recordMatch(created.profileToken, { roomId:"ROOM-3", matchId:"MATCH-3", mode:"FRIENDLY", outcome:"DRAW", opponentName:"B", deckName:"Mixed Deck", opponentDeckName:"IT Deck", turns:7, reason:"TURN_LIMIT", finishedAt:102 });
  assert.deepEqual(duplicate.matchHistory.map((item) => item.matchId), ["MATCH-3", "MATCH-2"]);
  assert.equal(duplicate.stats.matchesPlayed, 2);
  assert.equal(duplicate.stats.pvp.wins, 1);
  assert.equal(duplicate.stats.pvp.draws, 1);
  assert.equal(duplicate.stats.training.matches, 1);
  assert.equal(duplicate.stats.totalTurnsPlayed, 13);
  assert.equal(duplicate.stats.deckUsage["deck-cs"].wins, 2);
  assert.equal(duplicate.stats.departmentUsage.CS.matches, 2);
});

test("ranked settlement enriches the matching history record with rating and rank snapshots", () => {
  let id = 0;
  const service = new PlayerProfileService({
    playerIdFactory:() => `rank-${++id}`,
    tokenFactory:() => `rank-token-${id}`,
    nowFactory:() => 200,
    rankedConfig:{ initialRating:1000, placementsRequired:1 },
    rankedContentConfig:{ ranks:[
      { id:"BRONZE", order:1, displayKey:"Bronze", mmrMin:0, mmrMax:1000, divisions:["III"], rewards:[] },
      { id:"SILVER", order:2, displayKey:"Silver", mmrMin:1001, mmrMax:null, divisions:["I"], rewards:[] }
    ], seasons:[] }
  });
  const p1 = service.create(undefined, "One");
  const p2 = service.create(undefined, "Two");
  service.recordMatchForPlayerId(p1.profile.playerId, { roomId:"RANK-1", matchId:"MATCH-RANK-1", mode:"RANKED", outcome:"WIN", opponentName:"Two", deckName:"Ranked Deck", opponentDeckName:"Other", turns:8, reason:"REPUTATION_ZERO", finishedAt:200 });
  service.recordMatchForPlayerId(p2.profile.playerId, { roomId:"RANK-1", matchId:"MATCH-RANK-1", mode:"RANKED", outcome:"LOSS", opponentName:"One", deckName:"Other", opponentDeckName:"Ranked Deck", turns:8, reason:"REPUTATION_ZERO", finishedAt:200 });
  service.recordRankedMatch({ roomId:"RANK-1", p1PlayerId:p1.profile.playerId, p2PlayerId:p2.profile.playerId, winnerPlayerId:p1.profile.playerId, reason:"REPUTATION_ZERO", settledAt:201 });
  const history = service.get(p1.profileToken).matchHistory[0];
  assert.equal(history.ratingBefore, 1000);
  assert.equal(history.ratingAfter, 1020);
  assert.equal(history.ratingDelta, 20);
  assert.equal(history.rankBefore, "BRONZE III");
  assert.equal(history.rankAfter, "SILVER I");
  assert.equal(service.get(p1.profileToken).stats.ranked.wins, 1);
});

test("room completion writes one server history record per seat", () => {
  let playerId = 0;
  const service = new PlayerProfileService({
    playerIdFactory:() => `completion-${++playerId}`,
    tokenFactory:() => `completion-token-${playerId}`,
    nowFactory:() => 300
  });
  const p1 = service.create(undefined, "Host");
  const p2 = service.create(undefined, "Guest");
  let callbackCount = 0;
  const rooms = new RoomService({
    roomIdFactory:() => "HISTORY-ROOM",
    tokenFactory:(() => { let next = 0; return () => `room-token-${++next}`; })(),
    firstPlayerFactory:() => "P1",
    nowFactory:() => 300,
    onMatchCompleted:(completion) => {
      callbackCount += 1;
      for (const seatId of ["P1", "P2"] as const) {
        const seat = completion.seats[seatId];
        const opponent = completion.seats[seatId === "P1" ? "P2" : "P1"];
        if (!seat.profileId) continue;
        service.recordMatchForPlayerId(seat.profileId, {
          roomId:completion.roomId, matchId:completion.matchId, mode:completion.mode,
          outcome:completion.winnerPlayerId === seatId ? "WIN" : completion.winnerPlayerId ? "LOSS" : "DRAW",
          opponentName:opponent.displayName ?? "Opponent", deckName:seat.deckName,
          opponentDeckName:opponent.deckName, turns:0, reason:completion.reason,
          finishedAt:completion.endedAt ?? 300, selectedDeckId:seat.deckId,
          primaryDepartment:seat.department, playerFinalRep:seat.finalRep,
          opponentFinalRep:opponent.finalRep
        });
      }
    }
  });
  const created = rooms.createRoom("it-starter", { mode:"FRIENDLY" }, { profileId:p1.profile.playerId, displayName:p1.profile.displayName });
  const joined = rooms.joinRoom(created.roomId, "it-starter", { profileId:p2.profile.playerId, displayName:p2.profile.displayName });
  const version = joined.view.match?.stateVersion ?? 0;
  const finished = rooms.submitIntent(created.roomId, created.token, { intentId:"history-resign", expectedStateVersion:version, intent:{ type:"RESIGN" } });
  assert.equal(finished.response.accepted, true);
  assert.equal(callbackCount, 1);
  assert.equal(service.get(p1.profileToken).matchHistory.length, 1);
  assert.equal(service.get(p2.profileToken).matchHistory.length, 1);
  assert.equal(service.get(p1.profileToken).matchHistory[0].opponentName, "Guest");
  assert.equal(service.get(p1.profileToken).matchHistory[0].result, "LOSS");
  const replay = rooms.submitIntent(created.roomId, created.token, { intentId:"history-resign", expectedStateVersion:version, intent:{ type:"RESIGN" } });
  assert.equal(replay.replayed, true);
  assert.equal(callbackCount, 1);
});

test("Player File projects equipped Badge artwork without flattening the title hierarchy", () => {
  const appSource = readFileSync("public/app.js", "utf8");
  assert.match(appSource, /const badge = cosmeticBadgeMeta\(loadout\.badgeId\)/);
  assert.match(appSource, /class="player-file-title"/);
  assert.match(appSource, /class="player-file-badge"/);
  assert.match(appSource, /const badgeMarkup = badge \?/);
  assert.match(appSource, /silver-ranked-s01-inner-opening\.png/);
});

test("Player File mobile navigation and actions have reachable responsive structure", () => {
  const appSource = readFileSync("public/app.js", "utf8");
  const stylesSource = readFileSync("public/styles.css", "utf8");
  assert.match(appSource, /class="player-file-tabs"/);
  assert.match(appSource, /scrollIntoView\(\{ block:'nearest', inline:'nearest' \}\)/);
  assert.match(stylesSource, /\.player-file-tabs button \{ min-height:44px/);
  assert.match(stylesSource, /\.player-file-panel-heading \{ display:grid; grid-template-columns:minmax\(0,1fr\)/);
  assert.match(stylesSource, /\.player-file-footer \{ display:grid; grid-template-columns:1fr/);
});

console.log(`${passed}/6 player meta hub tests passed.`);
