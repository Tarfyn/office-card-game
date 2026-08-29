import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
import { alphaDeckPresets } from "../src/decks.js";
import { createAlphaMetaProfile, canSpendCurrency } from "../src/economy.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8"));

test("v2.9 room projection exposes deck names and departments for match onboarding", () => {
  const rooms = new RoomService({ roomIdFactory:()=>"INTRO9", tokenFactory:(()=>{let n=0;return()=>`i${++n}`;})(), seedFactory:()=>29, firstPlayerFactory:()=>"P1" });
  const host = rooms.createRoom("customer-service-starter");
  const guest = rooms.joinRoom(host.roomId, "it-starter");
  assert.equal(guest.view.hostDeckName, "Customer Service Starter v0.3");
  assert.equal(guest.view.guestDeckName, "IT Starter v0.3");
  assert.equal(guest.view.hostDepartment, "CUSTOMER_SERVICE");
  assert.equal(guest.view.guestDepartment, "IT");
});

test("v2.9 custom decks derive a dominant department for onboarding", () => {
  const rooms = new RoomService({ roomIdFactory:()=>"DOMDEP" });
  const cards = alphaDeckPresets["production-starter"].cards;
  const host = rooms.createRoom({ id:"custom:prod", name:"Factory Custom", cards });
  assert.equal(host.view.hostDepartment, "PRODUCTION");
});

test("v2.9 deckbuilder exposes sort, card preview, curve and tag analysis", () => {
  assert.match(app, /function deckStats\(deck\)/);
  assert.match(app, /function renderDeckStats\(deck\)/);
  assert.match(app, /function renderCollectionPreview\(def, deck\)/);
  assert.match(app, /id="collectionSort"/);
  assert.match(css, /\.cost-curve/);
  assert.match(css, /\.collection-preview/);
});

test("v2.9 opening hand and office-opening UX are game-facing", () => {
  assert.match(app, /function renderMatchOpening\(match\)/);
  assert.match(app, /FREE MULLIGAN/);
  assert.match(app, /THE OFFICE OPENS/);
  assert.match(css, /\.mulligan-panel/);
  assert.match(css, /\.match-opening/);
});

test("v2.9 meta profile and future currencies exist without active economy values", () => {
  const profile = createAlphaMetaProfile();
  assert.deepEqual(profile.balances, { OFFICE_CREDITS:0, SHREDDER_SCRAPS:0 });
  assert.equal(profile.collectionMode, "SANDBOX_ALL_AVAILABLE");
  assert.equal(canSpendCurrency(profile, "OFFICE_CREDITS", 1), false);
  assert.equal(economy.liveEnabled, false);
  assert.equal(Boolean(economy.sandboxEnabled), true);
  assert.equal(economy.rarityTiers.every((tier:any) => tier.scrapValue == null || tier.status === "TEST_VALUE"), true);
  assert.match(server, /\/api\/economy-config/);
});

test("v2.9 turn timer is planned as server-authoritative but remains disabled", () => {
  assert.equal(settings.turnTimer.supported, true);
  assert.equal(settings.turnTimer.enabledByDefault, false);
  assert.equal(settings.turnTimer.rankedMode, "PLANNED_REQUIRED");
  assert.equal(settings.turnTimer.serverAuthoritative, true);
  assert.equal(settings.turnTimer.turnSeconds, null);
  assert.match(server, /\/api\/match-settings/);
});

test("v2.9 public shell version updated", () => {
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/7 v2.9 tests passed.`);
