import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { applyCraft, applyScrap, createEconomySandboxProfile, openSandboxBooster, sandboxRarityTier } from "../src/economy.js";

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

test("v3.2 sandbox rarity assignment covers T0 through T3 without changing canonical card data", () => {
  const tiers = new Set(Object.values(alphaDefinitions).map(sandboxRarityTier));
  for (const tier of ["T0","T1","T2","T3"]) assert.ok(tiers.has(tier as any), `missing ${tier}`);
  assert.equal(Object.values(alphaDefinitions).some((card) => card.rarityTier != null), false);
});

test("v3.2 booster sandbox spends credits, awards five owned cards and increments progression", () => {
  const profile = createEconomySandboxProfile(500);
  const pack = economy.boosters.packs[0];
  const result = openSandboxBooster(profile, Object.values(alphaDefinitions), {
    price:pack.price, cardCount:pack.cardCount, guaranteedTiers:pack.rarityDistribution.guaranteed, flexSlotWeights:pack.rarityDistribution.flexSlotWeights
  }, 32001);
  assert.equal(result.profile.balances.OFFICE_CREDITS, 400);
  assert.equal(result.cardIds.length, 5);
  assert.deepEqual(result.tiers.slice(0,4), ["T0","T0","T0","T1"]);
  assert.equal(result.profile.progression.boostersOpened, 1);
  assert.equal(Object.values(result.profile.ownedCards).reduce((a,b)=>a+b,0), 5);
});

test("v3.2 configured shred and craft primitives remain available", () => {
  const t0 = economy.rarityTiers.find((tier:any)=>tier.id==="T0");
  let profile = createEconomySandboxProfile(0);
  profile.ownedCards["CS-001"] = 5;
  profile = applyScrap(profile, "CS-001", 1, t0.scrapValue);
  assert.equal(profile.ownedCards["CS-001"], 4);
  profile = applyScrap(profile,"CS-001",4,t0.scrapValue);
  assert.equal(profile.ownedCards["CS-001"], undefined);
  profile.balances.SHREDDER_SCRAPS = t0.craftCost;
  profile = applyCraft(profile, "IT-001", 1, t0.craftCost);
  assert.equal(profile.ownedCards["IT-001"], 1);
  assert.equal(profile.balances.SHREDDER_SCRAPS, 0);
});

test("v3.2 economy values are explicitly sandbox-only while live economy stays disabled", () => {
  assert.equal(economy.liveEnabled, false);
  assert.equal(economy.sandboxEnabled, true);
  assert.equal(economy.boosters.packs[0].status, "TEST_SANDBOX");
  assert.equal(economy.rarityTiers.every((tier:any)=>tier.status==="TEST_VALUE"), true);
});

test("v3.2 browser exposes booster reveal, owned counts and targeted shred/craft controls", () => {
  assert.match(app, /function renderEconomyLab\(\)/);
  assert.match(app, /function openEconomyBooster\(\)/);
  assert.match(app, /data-scrap-card/);
  assert.match(app, /data-craft-card/);
  assert.match(css, /v3\.2 playable local economy sandbox/);
  assert.match(css, /\.booster-reveal/);
});

test("v3.2 server exposes stateless sandbox transaction endpoints and public shell version", () => {
  assert.match(server, /\/api\/economy\/sandbox\/start/);
  assert.match(server, /\/api\/economy\/booster\/open/);
  assert.match(server, /\/api\/economy\/scrap/);
  assert.match(server, /\/api\/economy\/craft/);
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/6 v3.2 tests passed.`);
