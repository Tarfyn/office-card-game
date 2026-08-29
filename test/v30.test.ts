import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
import { applyCraft, applyScrap, awardCurrency, createAlphaMetaProfile } from "../src/economy.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)), "utf8"));

test("v3.0 attack connector redraw is scheduled on scroll and resize", () => {
  assert.match(app, /function scheduleAttackConnectorDraw\(\)/);
  assert.match(app, /window\.addEventListener\('scroll', scheduleAttackConnectorDraw/);
  assert.match(app, /document\.addEventListener\('scroll', scheduleAttackConnectorDraw/);
  assert.match(app, /window\.addEventListener\('resize', scheduleAttackConnectorDraw/);
  assert.match(app, /scheduleAttackConnectorDraw\(\);/);
});

test("v3.0 Friendly and Ranked Preview settings are server-owned and timers remain inactive", () => {
  const rooms = new RoomService({ roomIdFactory:()=>"MODE30", tokenFactory:()=>"token" });
  const friendly = rooms.createRoom("it-starter", { mode:"FRIENDLY" });
  assert.deepEqual(friendly.view.settings, { mode:"FRIENDLY", timerProfileId:"UNTIMED", timerActive:false });
  const rankedRooms = new RoomService({ roomIdFactory:()=>"RANK30", tokenFactory:()=>"token2" });
  const ranked = rankedRooms.createRoom("it-starter", { mode:"RANKED" });
  assert.deepEqual(ranked.view.settings, { mode:"RANKED", timerProfileId:"RANKED_STANDARD_TBD", timerActive:false });
  assert.equal(settings.turnTimer.serverAuthoritative, true);
  assert.equal(settings.turnTimer.turnSeconds, null);
});

test("v3.0 economy primitives support later scrap and craft transactions without enabling live economy", () => {
  let profile = createAlphaMetaProfile();
  profile.ownedCards["CS-001"] = 5;
  profile = applyScrap(profile, "CS-001", 1, 10);
  assert.equal(profile.ownedCards["CS-001"], 4);
  assert.equal(profile.balances.SHREDDER_SCRAPS, 10);
  profile = awardCurrency(profile, "SHREDDER_SCRAPS", 90);
  profile = applyCraft(profile, "IT-003", 1, 100);
  assert.equal(profile.ownedCards["IT-003"], 1);
  assert.equal(profile.balances.SHREDDER_SCRAPS, 0);
  assert.equal(economy.liveEnabled, false);
  assert.equal(economy.liveEnabled, false);
  assert.equal(Boolean(economy.sandboxEnabled), true);
});

test("v3.0 product UI exposes meta roadmap, match mode preview and board-only graphical polish", () => {
  assert.match(app, /function renderEconomyRoadmap\(\)/);
  assert.match(app, /id="createMode"/);
  assert.match(css, /v3\.0 meta-game scaffolding \+ graphical board polish/);
  assert.match(css, /\.meta-roadmap/);
  assert.match(css, /\.mode-preview/);
});

test("v3.0 public shell version updated", () => {
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/5 v3.0 tests passed.`);
