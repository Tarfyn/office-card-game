import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyMatchReward, createAlphaMetaProfile } from "../src/economy.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json", import.meta.url)), "utf8"));
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");

test("v3.5 meta profile tracks claimed reward rooms", () => {
  const profile = createAlphaMetaProfile();
  assert.deepEqual(profile.claimedRewardRooms, []);
});

test("v3.5 Friendly win reward grants configured Credits, XP and match progression", () => {
  const profile = createAlphaMetaProfile();
  const cfg = economy.progression.matchRewards.profiles.FRIENDLY;
  const result = applyMatchReward(profile, "WIN", cfg, economy.progression.levelXpStep);
  assert.equal(result.officeCredits, 35);
  assert.equal(result.xp, 30);
  assert.equal(result.profile.balances.OFFICE_CREDITS, 35);
  assert.equal(result.profile.progression.matchesCompleted, 1);
  assert.equal(result.profile.progression.xp, 30);
  assert.equal(result.profile.progression.level, 1);
});

test("v3.5 match XP advances profile level at the configured step", () => {
  const profile = createAlphaMetaProfile();
  profile.progression.xp = 90;
  const cfg = economy.progression.matchRewards.profiles.RANKED;
  const result = applyMatchReward(profile, "WIN", cfg, 100);
  assert.equal(result.profile.progression.xp, 130);
  assert.equal(result.profile.progression.level, 2);
});

test("v3.5 resigning loser receives reduced sandbox reward", () => {
  const cfg = economy.progression.matchRewards.profiles.FRIENDLY;
  const loss = applyMatchReward(createAlphaMetaProfile(), "LOSS", cfg, 100);
  const resign = applyMatchReward(createAlphaMetaProfile(), "RESIGN_LOSS", cfg, 100);
  assert.ok(resign.officeCredits < loss.officeCredits);
  assert.ok(resign.xp < loss.xp);
});

test("v3.5 server exposes one-time authoritative room reward claims", () => {
  assert.match(server, /\/api\\\/rooms\\\/\(\[\^\/\]\+\)\\\/reward\$/);
  assert.match(server, /matchRewardOutcome\(view\)/);
  assert.match(server, /applyMatchReward\(context\.meta/);
  assert.match(server, /claimedRewardRooms/);
  assert.match(server, /replayed:true/);
});

test("v3.5 browser supports owned-copy deckbuilding and visible match reward claim", () => {
  assert.match(app, /function ownedDeckMode\(\)/);
  assert.match(app, /function deckCopyCeiling\(definitionId\)/);
  assert.match(app, /data-collection-mode="OWNED_COPIES"/);
  assert.match(app, /function renderMatchRewardPanel\(match\)/);
  assert.match(app, /id="claimMatchReward"/);
  assert.match(css, /v3\.5 progression loop \+ owned-copy deckbuilder preview/);
});

test("v3.5 sandbox reward values remain explicitly provisional and shell version is updated", () => {
  assert.equal(economy.progression.matchRewards.status, "TEST_VALUES");
  assert.equal(economy.progression.matchRewards.sandboxEnabled, true);
  assert.equal(economy.liveEnabled, false);
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/7 v3.5 tests passed.`);
