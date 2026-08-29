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

test("v7.19 builds combat reads from visible current Power", () => {
  assert.match(app,/function currentEmployeePower\(instanceId\)/);
  assert.match(app,/function baseCombatRead\(attackerId, targetId\)/);
  assert.match(app,/const margin = attacker\.current - defender\.current/);
  assert.match(app,/TARGET DOWN · BT \+\$\{margin\}/);
  assert.match(app,/EVEN · BOTH DOWN/);
  assert.match(app,/ATTACKER DOWN · \$\{Math\.abs\(margin\)\} BEHIND/);
});

test("v7.19 only compares server-projected legal attack targets", () => {
  assert.match(app,/const attack = legalAttackOption\(attackerId\)/);
  assert.match(app,/const legalTargets = targetIds \?\? attack\?\.targetIds \?\? \[\]/);
  assert.match(app,/state\.interaction\?\.type === 'ATTACK'/);
  assert.match(app,/state\.interaction\.targetIds/);
  assert.doesNotMatch(app,/parseRulesText/);
});

test("v7.19 explicitly labels comparison as a base read before effects", () => {
  assert.match(app,/Base combat read only · Prevention, redirects, replacements and effects can change resolution\./);
  assert.match(app,/Base rule read before effects\./);
  assert.match(app,/If the direct attack resolves\./);
});

test("v7.19 connects pointer focus and touch attack selection to the same Power Check", () => {
  assert.match(app,/function renderCombatPowerRead\(match\)/);
  assert.match(app,/function updateCombatPowerRead\(attackerId = null\)/);
  assert.match(app,/updateCombatPowerRead\(legalAttackOption\(sourceId\) \? sourceId : null\)/);
  assert.match(app,/renderCombatPowerRead\(match\)/);
  assert.match(app,/POWER CHECK/);
});

test("v7.19 marks selected legal Employee targets with relative Power badges", () => {
  assert.match(app,/function attackTargetPowerBadge\(card\)/);
  assert.match(app,/POWER \+\$\{esc\(read\.margin\)\}/);
  assert.match(app,/POWER EVEN/);
  assert.match(app,/POWER −\$\{esc\(Math\.abs\(read\.margin\)\)\}/);
  assert.match(css,/\/\* v7\.19 current-Power combat read polish \*\//);
  assert.match(css,/\.runtime-badge\.combat-edge\.ahead/);
  assert.match(css,/\.combat-power-read-options/);
});

test("v7.19 remains presentation-only with economy and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.19\.0"/);
  assert.match(html,/v7\.19 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.19 tests passed.`);
