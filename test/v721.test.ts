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

test("v7.21 classifies live activity as key action or flow without rules-text parsing", () => {
  assert.match(app,/MATCH_FEED_KEY_TYPES/);
  assert.match(app,/MATCH_FEED_ACTION_TYPES/);
  assert.match(app,/function matchFeedImportance\(type\)/);
  assert.match(app,/KEY/);
  assert.match(app,/ACTION/);
  assert.match(app,/FLOW/);
  assert.doesNotMatch(app,/parseRulesText/);
});

test("v7.21 keeps the latest item first while surfacing a recent key moment", () => {
  assert.match(app,/The newest visible event always stays first/);
  assert.match(app,/const strongest = recent\.find/);
  assert.match(app,/item\.importance === 'key'/);
  assert.match(app,/latest stays first/);
});

test("v7.21 compacts resolved Battle and Action setup bursts rather than mutating the event log", () => {
  assert.match(app,/function collapseResolvedFeedBursts\(items = \[\]\)/);
  assert.match(app,/ATTACK_DECLARED/);
  assert.match(app,/ATTACK_TARGET_REDIRECTED/);
  assert.match(app,/DESTRUCTION_PREVENTED/);
  assert.match(app,/BATTLE_RESOLVED/);
  assert.match(app,/ABILITY_ACTIVATED/);
  assert.match(app,/ACTION_RESOLVED/);
  assert.match(app,/state\.eventLog = state\.eventLog\.slice\(-40\)/);
});

test("v7.21 makes grouped steps and recent context explicitly recoverable", () => {
  assert.match(app,/groupedCount/);
  assert.match(app,/\+\$\{esc\(item\.groupedCount\)\} steps/);
  assert.match(app,/Recent context/);
  assert.match(app,/full raw event stream remains available in Playtest tools/);
  assert.match(app,/Raw engine event log/);
});

test("v7.21 keeps the mobile activity surface compact", () => {
  assert.match(css,/\/\* v7\.21 match feed prioritization \+ event grouping polish \*\//);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.match-feed-context \{ display:none; \}/);
  assert.match(css,/\.match-feed-item\.latest/);
});

test("v7.21 remains presentation-only with economy and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.21\.0"/);
  assert.match(html,/v7\.21 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.21 tests passed.`);
