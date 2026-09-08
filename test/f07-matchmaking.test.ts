import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MatchmakingQueue, type MatchmakingStoreSnapshot } from "../src/matchmaking.js";

type Payload = { deck:string };
type Session = { roomId:string };

function persistence(initial:MatchmakingStoreSnapshot<Payload, Session>|null = null) {
  let saved = initial;
  let writes = 0;
  return {
    persistence:{ storageLabel:"TEST_MM", load:() => saved ? structuredClone(saved) : null, save:(snapshot:MatchmakingStoreSnapshot<Payload, Session>) => { saved = structuredClone(snapshot); writes += 1; } },
    read:() => saved ? structuredClone(saved) : null,
    writes:() => writes
  };
}

let passed = 0;
function test(name:string, fn:()=>void):void { try { fn(); passed += 1; console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; } }

test("F07 creates a server-owned lease and renews only near expiry", () => {
  let now = 1_000;
  const store = persistence();
  const queue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:100, persistence:store.persistence, ticketIdFactory:() => "f07-a" });
  const created = queue.enqueue("a", "FRIENDLY", { deck:"A" }).ticket;
  assert.equal(created.lastActivityAt, 1_000);
  assert.equal(created.leaseExpiresAt, 1_100);
  const writesAfterEnqueue = store.writes();
  now = 1_040;
  assert.equal(queue.touch("f07-a", "a").leaseExpiresAt, 1_100);
  assert.equal(store.writes(), writesAfterEnqueue);
  now = 1_051;
  const renewed = queue.touch("f07-a", "a");
  assert.equal(renewed.lastActivityAt, 1_051);
  assert.equal(renewed.leaseExpiresAt, 1_151);
  assert.equal(store.writes(), writesAfterEnqueue + 1);
});

test("F07 expires at the exact boundary and never revives", () => {
  let now = 0;
  const queue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:10, ticketIdFactory:() => "f07-boundary" });
  queue.enqueue("a", "FRIENDLY", { deck:"A" });
  now = 10;
  const expired = queue.touch("f07-boundary", "a");
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.expiredReason, "QUEUE_LEASE_EXPIRED");
  now = 1_000;
  assert.equal(queue.touch("f07-boundary", "a").status, "EXPIRED");
});

test("F07 skips expired candidates without poisoning later matching", () => {
  let now = 0;
  let next = 0;
  const queue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:10, ticketIdFactory:() => `f07-${++next}` });
  const a = queue.enqueue("a", "FRIENDLY", { deck:"A" }).ticket;
  now = 5;
  const b = queue.enqueue("b", "FRIENDLY", { deck:"B" }).ticket;
  assert.equal(b.status, "WAITING");
  now = 10;
  assert.equal(queue.findOpponent(b.ticketId, "b"), null);
  assert.equal(queue.get(a.ticketId, "a").status, "EXPIRED");
  const c = queue.enqueue("c", "FRIENDLY", { deck:"C" });
  assert.equal(c.opponent?.ticketId, b.ticketId);
});

test("F07 keeps an actively heartbeating queue live for long elapsed time", () => {
  let now = 0;
  const queue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:100, ticketIdFactory:() => "f07-long" });
  queue.enqueue("a", "RANKED", { deck:"A" });
  for (let i = 0; i < 7 * 24; i += 1) {
    now += 90;
    assert.equal(queue.touch("f07-long", "a").status, "WAITING");
  }
  now += 99;
  assert.equal(queue.get("f07-long", "a").status, "WAITING");
  now += 1;
  assert.equal(queue.get("f07-long", "a").status, "EXPIRED");
});

test("F07 restores legacy waiting tickets conservatively", () => {
  let now = 50;
  const recent = persistence({ version:1, tickets:[{ ticketId:"legacy-recent", profileId:"a", mode:"FRIENDLY", status:"WAITING", payload:{ deck:"A" }, createdAt:0, matchedTicketId:null, session:null }] as any });
  const recentQueue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:100, persistence:recent.persistence });
  assert.equal(recentQueue.get("legacy-recent", "a").status, "WAITING");
  const old = persistence({ version:1, tickets:[{ ticketId:"legacy-old", profileId:"a", mode:"FRIENDLY", status:"WAITING", payload:{ deck:"A" }, createdAt:0, matchedTicketId:null, session:null }] as any });
  now = 100;
  const oldQueue = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:100, persistence:old.persistence });
  assert.equal(oldQueue.get("legacy-old", "a").status, "EXPIRED");
  assert.equal(oldQueue.get("legacy-old", "a").expiredReason, "QUEUE_LEASE_EXPIRED");
});

test("F07 protects owner-only heartbeat and terminal states across restart", () => {
  let now = 0;
  const store = persistence();
  let next = 0;
  const first = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:10, persistence:store.persistence, ticketIdFactory:() => `f07-r${++next}` });
  const ticket = first.enqueue("a", "FRIENDLY", { deck:"A" }).ticket;
  assert.throws(() => first.touch(ticket.ticketId, "other"), /MATCHMAKING_TICKET_FORBIDDEN/);
  now = 10;
  assert.equal(first.get(ticket.ticketId, "a").status, "EXPIRED");
  const restarted = new MatchmakingQueue<Payload, Session>({ nowFactory:() => now, leaseDurationMs:10, persistence:store.persistence, ticketIdFactory:() => "f07-r2" });
  assert.equal(restarted.get(ticket.ticketId, "a").status, "EXPIRED");
  assert.equal(restarted.enqueue("a", "FRIENDLY", { deck:"A" }).ticket.ticketId, "f07-r2");
});

test("F07 server and client use the lease boundary without enabling turn timers", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  assert.match(server, /MATCHMAKING_LEASE_MS/);
  assert.match(server, /matchmaking\.touch/);
  assert.match(server, /liveOpponent\.status !== "WAITING"/);
  assert.match(server, /liveCurrent\.status !== "WAITING"/);
  assert.match(app, /matchmakingExpiredMessage/);
  assert.match(app, /QUEUE_LEASE_EXPIRED|EXPIRED/);
  assert.match(server, /timerActive:false/);
});

console.log(`${passed}/7 F07 matchmaking tests passed.`);
