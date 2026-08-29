import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { aggregatePlaytestAnalytics, filterPlaytestRecords, normalizePlaytestFilter, playtestAnalyticsDimensions, playtestRecordsCsv } from "../src/playtest-analytics.js";
import { RoomService } from "../src/room.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function dataset() {
  const now = { value:1_000 };
  let roomNo = 0;
  let tokenNo = 0;
  const rooms = new RoomService({ roomIdFactory:()=>`F43${++roomNo}`, tokenFactory:()=>`f43-token-${++tokenNo}`, firstPlayerFactory:()=>"P1", nowFactory:()=>now.value });
  const finish = (hostDeck:string, guestDeck:string, mode:"FRIENDLY"|"RANKED", resign:"HOST"|"GUEST") => {
    const host = rooms.createRoom(hostDeck, { mode });
    const guest = rooms.joinRoom(host.roomId, guestDeck);
    const actor = resign === "HOST" ? host : guest;
    const view = rooms.getView(host.roomId, actor.token, 0);
    rooms.submitIntent(host.roomId, actor.token, { intentId:`resign-${host.roomId}`, expectedStateVersion:view.match!.stateVersion, intent:{ type:"RESIGN" } });
    return host.roomId;
  };
  const r1 = finish("customer-service-starter", "it-starter", "FRIENDLY", "GUEST");
  now.value += 10 * 86400000;
  const r2 = finish("office-starter", "production-starter", "RANKED", "HOST");
  now.value += 10 * 86400000;
  const r3 = finish("marketing-starter", "customer-service-starter", "FRIENDLY", "GUEST");
  return { records:rooms.listPlaytestRecords(), r1, r2, r3 };
}

test("v4.3 filters human playtest records by mode without changing source records", () => {
  const { records, r1, r3 } = dataset();
  const friendly = filterPlaytestRecords(records, { mode:"FRIENDLY" });
  assert.deepEqual(friendly.map((record) => record.roomId).sort(), [r1, r3].sort());
  assert.equal(records.length, 3);
  assert.equal(aggregatePlaytestAnalytics(friendly).totals.completedMatches, 2);
});

test("v4.3 department and deck filters match either seat", () => {
  const { records, r1, r3 } = dataset();
  const byDepartment = filterPlaytestRecords(records, { department:"CUSTOMER_SERVICE" });
  const byDeck = filterPlaytestRecords(records, { deckId:"customer-service-starter" });
  assert.deepEqual(byDepartment.map((record) => record.roomId).sort(), [r1, r3].sort());
  assert.deepEqual(byDeck.map((record) => record.roomId).sort(), [r1, r3].sort());
});

test("v4.3 time-window and latest-completed sampling select deterministic recent matches", () => {
  const { records, r2, r3 } = dataset();
  const sorted = records.slice().sort((a,b) => Number(a.endedAt)-Number(b.endedAt));
  const from = Number(sorted[1].endedAt) - 1;
  const windowed = filterPlaytestRecords(records, { from });
  assert.deepEqual(windowed.map((record) => record.roomId).sort(), [r2, r3].sort());
  const latest = filterPlaytestRecords(records, { latestCompleted:1 });
  assert.equal(latest.length, 1);
  assert.equal(latest[0].roomId, r3);
});

test("v4.3 filter normalization and dimensions support stable dashboard controls", () => {
  const { records } = dataset();
  const normalized = normalizePlaytestFilter({ mode:"RANKED", from:5000, to:1000, latestCompleted:99999, department:" CUSTOMER_SERVICE " });
  assert.equal(normalized.mode, "RANKED");
  assert.equal(normalized.from, 1000);
  assert.equal(normalized.to, 5000);
  assert.equal(normalized.latestCompleted, 5000);
  assert.equal(normalized.department, "CUSTOMER_SERVICE");
  const dimensions = playtestAnalyticsDimensions(records);
  assert.equal(dimensions.completedMatches, 3);
  assert.ok(dimensions.departments.includes("CUSTOMER_SERVICE"));
  assert.ok(dimensions.departments.includes("MARKETING"));
  assert.ok(dimensions.decks.some((deck) => deck.deckId === "production-starter"));
  assert.ok(Number(dimensions.newestEndedAt) > Number(dimensions.oldestEndedAt));
});

test("v4.3 CSV export honors the already-filtered sample", () => {
  const { records } = dataset();
  const filtered = filterPlaytestRecords(records, { mode:"RANKED" });
  const csv = playtestRecordsCsv(filtered);
  assert.equal(csv.trim().split("\n").length, 2);
  assert.match(csv, /Office Starter v0\.1/);
  assert.match(csv, /Production Starter v0\.1/);
  assert.doesNotMatch(csv, /Customer Service Starter v0\.3|Marketing Starter v0\.1/);
});

test("v4.3 filtered analytics/export and match-history controls are wired without activating timers", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
  assert.match(server, /version: "4\.3\.0"/);
  assert.match(server, /filterPlaytestRecords/);
  assert.match(server, /url\.searchParams\.get\("department"\)/);
  assert.match(server, /url\.searchParams\.get\("latest"\)/);
  assert.match(app, /analyticsDepartment/);
  assert.match(app, /analyticsLatest/);
  assert.match(app, /historyOutcome/);
  assert.match(app, /Exports use the exact same active filters/);
  assert.match(html, /v4\.3 alpha playtest/i);
  const rooms = new RoomService({ roomIdFactory:()=>"OFF430", tokenFactory:()=>"off-token", nowFactory:()=>1_000 });
  const host = rooms.createRoom("customer-service-starter", { mode:"RANKED" });
  assert.equal(host.view.settings.timerActive, false);
});

console.log(`${passed}/6 v4.3 tests passed.`);
