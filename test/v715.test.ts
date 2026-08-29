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

test("v7.15 adds objective End-phase handoff context", () => {
  assert.match(app,/function endPhaseContext\(match\)/);
  assert.match(app,/END DESK/);
  assert.match(app,/HANDOFF/);
  assert.match(app,/CAP LEFT/);
  assert.match(app,/renderEndPhaseContext\(match\)/);
});

test("v7.15 derives handoff and archive state from live match projection", () => {
  assert.match(app,/archiveNeeded = Math\.max\(0, hand\.length - 8\)/);
  assert.match(app,/handoffReady:Boolean\(legal\.canAdvancePhase\) && archiveNeeded === 0/);
  assert.match(app,/abilities:\(legal\.activatableAbilities \?\? \[\]\)\.length/);
  assert.match(app,/archiveExcessHandIds/);
});

test("v7.15 makes exact hand-limit selection clear and guarded", () => {
  assert.match(app,/Hand limit · \$\{archiveSelected\}\/\$\{archiveNeeded\} selected/);
  assert.match(app,/Select exactly \$\{archiveNeeded\} card/);
  assert.match(app,/Hand limit selection complete/);
  assert.match(app,/archiveSelected === archiveNeeded \? '' : 'disabled'/);
});

test("v7.15 Inspector and hand zone explain server-projected hand-limit choices", () => {
  assert.match(app,/function endPhaseHandAvailabilityNote\(card\)/);
  assert.match(app,/tag:'HAND LIMIT'/);
  assert.match(app,/Select exactly \$\{needed\} to Archive · \$\{handCount\}\/8/);
  assert.match(app,/const endNote = endPhaseHandAvailabilityNote\(card\)/);
});

test("v7.15 End Desk remains compact on mobile", () => {
  assert.match(css,/\/\* v7\.15 end-phase handoff readability polish \*\//);
  assert.match(css,/\.end-phase-context/);
  assert.match(css,/\.end-phase-context-stats/);
  assert.match(css,/@media \(max-width:800px\)[\s\S]*\.end-phase-context-stats \{ display:flex; overflow-x:auto/);
});

test("v7.15 remains presentation-only with economy and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.15\.0"/);
  assert.match(html,/v7\.15 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.15 tests passed.`);
