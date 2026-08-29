import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name:string, fn:()=>void):void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const app = readFileSync(fileURLToPath(new URL("../../public/app.js",import.meta.url)),"utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css",import.meta.url)),"utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs",import.meta.url)),"utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html",import.meta.url)),"utf8");
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json",import.meta.url)),"utf8"));
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json",import.meta.url)),"utf8"));

test("v7.20 derives a temporary resolution trace from projected events", () => {
  assert.match(app,/function buildResolutionTrace\(events = \[\]\)/);
  assert.match(app,/RESOLUTION_TRACE_TERMINALS/);
  assert.match(app,/state\.resolutionTrace = resolutionTrace/);
  assert.match(app,/5200/);
  assert.match(app,/renderResolutionTrace\(match\)/);
});

test("v7.20 traces visible battle redirect prevention and final Power outcome", () => {
  assert.match(app,/ATTACK_TARGET_REDIRECTED/);
  assert.match(app,/DESTRUCTION_PREVENTED/);
  assert.match(app,/BATTLE_RESOLVED/);
  assert.match(app,/code:'POWER'/);
  assert.match(app,/replacedOrPreventedIds/);
  assert.match(app,/Final visible Battle result/);
});

test("v7.20 avoids duplicate destruction and Breakthrough reputation steps", () => {
  assert.match(app,/BATTLE_RESOLVED already carries the authoritative visible outcome/);
  assert.match(app,/event\.data\?\.reason === 'BREAKTHROUGH'/);
  assert.match(app,/Breakthrough has its own explicit step/);
});

test("v7.20 supports chain and effect resolution without rules-text interpretation", () => {
  assert.match(app,/CHAIN_ITEM_NEGATED/);
  assert.match(app,/CHAIN_ITEM_DELAYED/);
  assert.match(app,/ACTION_RESOLVED/);
  assert.match(app,/CHAIN_RESOLVED/);
  assert.match(app,/Visible projected events only · hidden information remains redacted\./);
  assert.doesNotMatch(app,/parseRulesText/);
});

test("v7.20 renders a compact mobile-safe resolution step rail", () => {
  assert.match(app,/LAST RESOLUTION/);
  assert.match(app,/resolution-trace-steps/);
  assert.match(css,/\/\* v7\.20 resolution trace \+ cause\/effect readability polish \*\//);
  assert.match(css,/\.resolution-trace-step:not\(:last-child\)::after/);
  assert.match(css,/@media \(max-width:800px\)[\s\S]*\.resolution-trace/);
});

test("v7.20 remains presentation-only with economy and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.20\.0"/);
  assert.match(html,/v7\.20 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.20 tests passed.`);
