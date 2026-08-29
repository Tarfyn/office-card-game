import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { aggregatePlaytestAnalytics, playtestRecordsCsv } from "../src/playtest-analytics.js";
import { RoomService } from "../src/room.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function completeHumanMatch() {
  const now = { value:1_000 };
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"ANA420", tokenFactory:()=>`ana-${++tokenNo}`, seedFactory:()=>42, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value });
  const host = rooms.createRoom("customer-service-starter", {}, { profileId:"private-profile-a", displayName:"Alice Secret" });
  const guest = rooms.joinRoom(host.roomId, "it-starter", { profileId:"private-profile-b", displayName:"Bob Secret" });
  let hostView = rooms.getView(host.roomId, host.token, 0);
  rooms.submitIntent(host.roomId, host.token, { intentId:"keep-p1", expectedStateVersion:hostView.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  let guestView = rooms.getView(host.roomId, guest.token, 0);
  rooms.submitIntent(host.roomId, guest.token, { intentId:"keep-p2", expectedStateVersion:guestView.match!.stateVersion, intent:{ type:"MULLIGAN", returnIds:[] } });
  now.value = 6_000;
  guestView = rooms.getView(host.roomId, guest.token, 0);
  rooms.submitIntent(host.roomId, guest.token, { intentId:"resign-p2", expectedStateVersion:guestView.match!.stateVersion, intent:{ type:"RESIGN" } });
  return { rooms, host, guest, now };
}

test("v4.2 RoomService exposes anonymized playtest records from persisted room state", () => {
  const { rooms } = completeHumanMatch();
  const records = rooms.listPlaytestRecords();
  assert.equal(records.length, 1);
  const record = records[0];
  assert.equal(record.status, "ENDED");
  assert.equal(record.firstPlayerId, "P1");
  assert.equal(record.winnerId, "P1");
  assert.equal(record.seats.P1?.department, "CUSTOMER_SERVICE");
  assert.equal(record.seats.P2?.department, "IT");
  const serialized = JSON.stringify(record);
  assert.doesNotMatch(serialized, /Alice Secret|Bob Secret|private-profile/);
  assert.doesNotMatch(serialized, /ana-1|ana-2/);
});

test("v4.2 aggregate report calculates first-player, department and human decision metrics", () => {
  const { rooms } = completeHumanMatch();
  const analytics = aggregatePlaytestAnalytics(rooms.listPlaytestRecords(), 10_000);
  assert.equal(analytics.totals.completedMatches, 1);
  assert.equal(analytics.totals.decisiveMatches, 1);
  assert.equal(analytics.totals.firstPlayerWins, 1);
  assert.equal(analytics.totals.firstPlayerWinRate, 100);
  assert.equal(analytics.decisions.TURN.segments, 1);
  assert.equal(analytics.decisions.TURN.totalSeconds, 5);
  const cs = analytics.departments.find((item) => item.department === "CUSTOMER_SERVICE");
  const it = analytics.departments.find((item) => item.department === "IT");
  assert.deepEqual({ wins:cs?.wins, losses:cs?.losses, winRate:cs?.winRate }, { wins:1, losses:0, winRate:100 });
  assert.deepEqual({ wins:it?.wins, losses:it?.losses, winRate:it?.winRate }, { wins:0, losses:1, winRate:0 });
});

test("v4.2 aggregate report includes disconnect quality without leaking player identity", () => {
  const now = { value:1_000 };
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>"NET420", tokenFactory:()=>`net-${++tokenNo}`, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value });
  const host = rooms.createRoom("office-starter", {}, { displayName:"Do Not Export" });
  const guest = rooms.joinRoom(host.roomId, "production-starter");
  const c = rooms.connectSeat(host.roomId, host.token);
  now.value = 2_000; c.disconnect();
  now.value = 5_500; const r = rooms.connectSeat(host.roomId, host.token);
  now.value = 6_000;
  rooms.submitIntent(host.roomId, guest.token, { intentId:"resign-net", expectedStateVersion:rooms.getView(host.roomId, guest.token, 0).match!.stateVersion, intent:{ type:"RESIGN" } });
  r.disconnect();
  const analytics = aggregatePlaytestAnalytics(rooms.listPlaytestRecords());
  assert.equal(analytics.connectivity.matchesWithDisconnects, 1);
  assert.ok(analytics.connectivity.totalDisconnects >= 1);
  assert.ok(analytics.connectivity.totalReconnects >= 1);
  assert.ok(analytics.connectivity.totalOfflineSeconds >= 3.5);
  assert.doesNotMatch(JSON.stringify(analytics), /Do Not Export/);
});

test("v4.2 CSV export contains one row per completed match and useful tuning columns", () => {
  const { rooms } = completeHumanMatch();
  const csv = playtestRecordsCsv(rooms.listPlaytestRecords());
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /firstPlayerId,winnerId,reason,turns,durationSeconds/);
  assert.match(lines[0], /p1TurnSeconds,p2TurnSeconds/);
  assert.match(lines[1], /Customer Service Starter v0\.3/);
  assert.match(lines[1], /IT Starter v0\.3/);
  assert.doesNotMatch(csv, /Secret|profile-|ana-1|ana-2/);
});

test("v4.2 analytics handles an empty fresh server without misleading percentages", () => {
  const analytics = aggregatePlaytestAnalytics([], 42);
  assert.equal(analytics.generatedAt, 42);
  assert.equal(analytics.totals.completedMatches, 0);
  assert.equal(analytics.totals.firstPlayerWinRate, null);
  assert.equal(analytics.totals.averageTurns, null);
  assert.equal(analytics.decisions.TURN.averageSegmentSeconds, null);
  assert.deepEqual(analytics.departments, []);
});

test("v4.2 analytics API, JSON/CSV export and lobby dashboard are wired without activating timers", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
  assert.match(server, /version: "4\.2\.0"/);
  assert.match(server, /\/api\/playtest\/analytics/);
  assert.match(server, /playtestRecordsCsv/);
  assert.match(app, /Playtest analytics/);
  assert.match(app, /HUMAN PLAYTEST DATA/);
  assert.match(app, /analytics\/export\?format=csv/);
  assert.match(html, /v4\.2 alpha playtest/i);
  const rooms = new RoomService({ roomIdFactory:()=>"OFF420", tokenFactory:()=>"off-token", nowFactory:()=>1_000 });
  const host = rooms.createRoom("customer-service-starter", { mode:"RANKED" });
  assert.equal(host.view.settings.timerActive, false);
});

console.log(`${passed}/6 v4.2 tests passed.`);
