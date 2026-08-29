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

test("v7.18 adds projected board action focus metadata", () => {
  assert.match(app,/function projectedChoiceTargetIds\(targetChoices = \[\]\)/);
  assert.match(app,/function boardActionFocusMeta\(instanceId\)/);
  assert.match(app,/data-board-focus-source=/);
  assert.match(app,/data-board-focus-targets=/);
  assert.match(app,/data-board-focus-direct=/);
});

test("v7.18 attack focus uses server-projected attack targets including direct attacks", () => {
  assert.match(app,/const attack = legalAttackOption\(instanceId\)/);
  assert.match(app,/for \(const targetId of attack\.targetIds \?\? \[\]\)/);
  assert.match(app,/if \(targetId == null\) direct = true/);
  assert.match(app,/document\.querySelector\('#opponentBoard'\)\?\.classList\.add\('board-focus-direct'\)/);
});

test("v7.18 ability and response focus only reuse projected candidate ids", () => {
  assert.match(app,/const ability = legalAbilityOption\(instanceId\)/);
  assert.match(app,/const response = legalResponseOption\(instanceId\)/);
  assert.match(app,/projectedChoiceTargetIds\(ability\?\.targetChoices\)/);
  assert.match(app,/projectedChoiceTargetIds\(response\?\.targetChoices\)/);
  assert.match(app,/choice\?\.candidateIds/);
  assert.doesNotMatch(app,/parseRulesText/);
});

test("v7.18 binds hover and keyboard focus without replacing touch target interaction", () => {
  assert.match(app,/function bindBoardActionFocusHandlers\(\)/);
  assert.match(app,/addEventListener\('mouseenter', \(\) => applyBoardActionFocus\(el\)\)/);
  assert.match(app,/addEventListener\('focus', \(\) => applyBoardActionFocus\(el\)\)/);
  assert.match(app,/bindBoardActionFocusHandlers\(\)/);
  assert.match(app,/if \(state\.interaction\?\.type === 'ATTACK'\)/);
});

test("v7.18 focus styling keeps source and targets readable and avoids touch dimming", () => {
  assert.match(css,/\/\* v7\.18 board action-focus polish \*\//);
  assert.match(css,/\.card\.board-focus-source/);
  assert.match(css,/\.card\.board-focus-target/);
  assert.match(css,/\.card\.board-focus-muted/);
  assert.match(css,/@media \(hover:none\), \(pointer:coarse\)[\s\S]*board-focus-muted \{ opacity:1; filter:none; \}/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test("v7.18 remains presentation-only with economy and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.18\.0"/);
  assert.match(html,/v7\.18 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.18 tests passed.`);
