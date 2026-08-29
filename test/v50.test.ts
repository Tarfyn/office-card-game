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

test("v5.0 keeps short combat event batches for coherent battle feedback", () => {
  assert.match(app,/visualCueBatch/);
  assert.match(app,/BATTLE_RESOLVED/);
  assert.match(app,/function renderCombatMoment\(\)/);
  assert.match(app,/class=\"combat-moment/);
  assert.match(css,/\.combat-moment\.breakthrough/);
});

test("v5.0 strengthens attack and Reputation impact without changing board geometry", () => {
  assert.match(app,/attackGlowPath/);
  assert.match(css,/path#attackGlowPath/);
  assert.match(app,/reputation-impact-number/);
  assert.match(app,/reputationImpactAmount\(player\.id\)/);
  assert.match(css,/@keyframes rep-number-pop/);
});

test("v5.0 destruction feedback reaches the Archive", () => {
  assert.match(app,/function archiveImpactForPlayer\(playerId\)/);
  assert.match(app,/archive-impact-chip/);
  assert.match(css,/\.archive-compact\.archive-impact/);
  assert.match(css,/@keyframes archive-receive/);
});

test("v5.0 target and Promotion material states are explicit on cards", () => {
  assert.match(app,/function promotionMaterialCandidateIds\(\)/);
  assert.match(app,/promotion-material-candidate/);
  assert.match(css,/content:'ATTACK TARGET'/);
  assert.match(css,/content:'LOCKED'/);
  assert.match(css,/content:'MATERIAL'/);
});

test("v5.0 response and Chain presentation marks the next resolving link", () => {
  assert.match(app,/resolves-next/);
  assert.match(css,/\.chain-item\.resolves-next/);
  assert.match(css,/content:'RESOLVES NEXT'/);
  assert.match(css,/@keyframes response-ring/);
});

test("v5.0 remains visual-only with the Ranked timer disabled and the 97-card pool intact", () => {
  assert.match(server,/version: "5\.0\.0"/);
  assert.match(html,/v5\.0 alpha playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.equal(settings.ranked.enabled,true);
  assert.ok(cards.length>=97);
});

console.log(`${passed}/6 v5.0 tests passed.`);
