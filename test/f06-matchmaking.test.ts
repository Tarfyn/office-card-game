import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MatchmakingQueue, type MatchmakingStoreSnapshot } from "../src/matchmaking.js";

let passed = 0;
function test(name:string, fn:()=>void):void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test("F06 terminal invalid ticket is durable and no longer matchable", () => {
  let saved:MatchmakingStoreSnapshot<any, any>|null = null;
  const persistence = {
    storageLabel:"TEST_MM",
    load:() => saved ? structuredClone(saved) : null,
    save:(snapshot:MatchmakingStoreSnapshot<any, any>) => { saved = structuredClone(snapshot); }
  };
  let next = 0;
  const first = new MatchmakingQueue({ persistence, ticketIdFactory:() => `f06-${++next}` });
  const a = first.enqueue("a", "RANKED", { deckSelection:{ id:"deck-a", cards:[] }, storageKind:"POSTGRES" }).ticket;
  const b = first.enqueue("b", "RANKED", { deckSelection:{ id:"deck-b", cards:[] }, storageKind:"POSTGRES" }).ticket;
  assert.equal(a.status, "WAITING");
  assert.equal(b.status, "WAITING");
  assert.equal(first.markInvalid(a.ticketId, "DECK_STALE").status, "INVALID");
  assert.equal(first.findOpponent(b.ticketId, "b"), null);
  const restarted = new MatchmakingQueue({ persistence });
  assert.equal(restarted.get(a.ticketId, "a").status, "INVALID");
  assert.equal(restarted.get(a.ticketId, "a").invalidReason, "DECK_STALE");
  assert.equal(restarted.get(b.ticketId, "b").status, "WAITING");
});

test("F06 server uses commit-time profile locks and exact validated deck payloads", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  assert.match(server, /withProfilesLocked/);
  assert.match(server, /validateQueuedTicketProfile/);
  assert.match(server, /const created = rooms\.createRoom\(opponentDeck/);
  assert.doesNotMatch(server, /rooms\.createRoom\(opponent\.payload\.deckSelection/);
  assert.match(server, /matchmakingCommitMutex/);
});

console.log(`${passed}/2 F06 matchmaking tests passed.`);
