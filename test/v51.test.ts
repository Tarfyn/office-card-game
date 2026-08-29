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
const cards = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/cards.json",import.meta.url)),"utf8"));

const teamLead = cards.find((card:any)=>card.id === "CS-006");
const head = cards.find((card:any)=>card.id === "CS-007");

test("v5.1 always renders printed Employee Power independently from runtime currentPower", () => {
  assert.match(app,/function cardPowerState\(card, def\)/);
  assert.match(app,/def\.cardType !== 'EMPLOYEE' \|\| def\.power == null/);
  assert.match(app,/const printed = Number\(def\.power\)/);
  assert.match(app,/const current = card\?\.currentPower != null \? Number\(card\.currentPower\) : printed/);
  assert.match(app,/<span>POWER<\/span><b>\$\{esc\(power\.printed\)\}<\/b>/);
});

test("v5.1 shows a separate green or red Current Power number only when Power changed", () => {
  assert.match(app,/changed \? `<div class="current-power-badge \$\{direction\}"/);
  assert.match(app,/power\.delta > 0 \? 'boosted' : power\.delta < 0 \? 'debuffed'/);
  assert.match(css,/\.current-power-badge\.boosted \{ background: #2f8b57; \}/);
  assert.match(css,/\.current-power-badge\.debuffed \{ background: #b44b45; \}/);
});

test("v5.1 visually separates top-right Cost from bottom-right Power", () => {
  assert.match(css,/\.card-cost-badge/);
  assert.match(css,/\.power-cluster \{[\s\S]*right: 4px;[\s\S]*bottom: 4px;/);
  assert.match(css,/\.power-cluster \.power-badge \{[\s\S]*grid-template-rows: 7px 1fr;/);
  assert.match(css,/\.card\.legal-card \.power-cluster \{ bottom: 4px; \}/);
});

test("v5.1 makes printed and current Power explicit in hover and close-up runtime copy", () => {
  assert.match(app,/CURRENT \$\{power\.current\}/);
  assert.match(app,/Printed Power \$\{power\.printed\} · Current Power \$\{power\.current\}/);
  assert.match(app,/powerRuntimeText\(card, def\)/);
  assert.match(app,/renderPowerDisplay\(card, def\)/);
});

test("v5.1 preserves the intended Customer Service Team Lead other-only aura", () => {
  assert.equal(teamLead.power,4);
  assert.match(teamLead.rulesText,/Other Customer Service Employees you control get \+1 Power/);
  assert.equal(teamLead.abilities?.[0]?.appliesTo?.excludeSource,true);
  assert.equal(head.cost?.play,6);
  assert.equal(head.power,5);
});

test("v5.1 remains presentation-only with Ranked timer disabled and the 97-card pool intact", () => {
  assert.match(server,/version: "5\.1\.0"/);
  assert.match(html,/v5\.1 alpha playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
});

console.log(`${passed}/6 v5.1 tests passed.`);
