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

const longest = [...cards].sort((a:any,b:any)=>(b.rulesText?.length ?? 0)-(a.rulesText?.length ?? 0))[0];
const teamLead = cards.find((card:any)=>card.id === "CS-006");
const head = cards.find((card:any)=>card.id === "CS-007");

test("v5.2 replaces the plain ARTWORK label with one coherent alpha fallback renderer", () => {
  assert.match(app,/function artworkFallback\(def, className = 'card-art-window'\)/);
  assert.match(app,/fallback-art-scene/);
  assert.match(app,/fallback-art-mark/);
  assert.match(app,/return artworkFallback\(def, className\)/);
  assert.match(app,/artworkFallback\(def, 'catalog-fallback-art'\)/);
  assert.match(css,/\.catalog-fallback-art/);
});

test("v5.2 adapts small and close-up rules typography for long unchanged rules text", () => {
  assert.match(app,/function rulesDensityClass\(text = ''\)/);
  assert.match(app,/length >= 205/);
  assert.match(app,/length >= 155/);
  assert.match(app,/card-rules-mini \$\{rulesDensityClass\(def\.rulesText\)\}/);
  assert.match(app,/modal-rules-box \$\{rulesDensityClass\(def\.rulesText\)\}/);
  assert.match(css,/\.card-rules-mini\.rules-dense/);
  assert.match(css,/\.modal-card-face \.modal-rules-box\.rules-ultra/);
  assert.ok(longest.rulesText.length >= 205);
});

test("v5.2 surfaces flavor during hover and keeps it as a distinct inspect panel", () => {
  assert.match(app,/class="hover-flavor"/);
  assert.match(app,/class="frame-panel flavor-panel"/);
  assert.match(css,/\.hover-flavor/);
  assert.match(css,/\.flavor-panel/);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
});

test("v5.2 makes close-up runtime state scannable including current Power deltas", () => {
  assert.match(app,/class="runtime-detail-grid"/);
  assert.match(app,/PRINTED POWER/);
  assert.match(app,/CURRENT POWER/);
  assert.match(app,/class="runtime-detail \$\{power\.delta > 0 \? 'positive' : 'negative'\}"/);
  assert.match(app,/Live match state/);
  assert.match(css,/\.runtime-detail\.positive/);
  assert.match(css,/\.runtime-detail\.negative/);
});

test("v5.2 preserves the v5.1 Cost and Power contract for Customer Service leadership", () => {
  assert.equal(teamLead.cost?.play,4);
  assert.equal(teamLead.power,4);
  assert.equal(teamLead.abilities?.[0]?.appliesTo?.excludeSource,true);
  assert.equal(head.cost?.play,6);
  assert.equal(head.power,5);
  assert.match(app,/<span>POWER<\/span><b>\$\{esc\(power\.printed\)\}<\/b>/);
});

test("v5.2 remains presentation-only with Ranked timer disabled and the 97-card pool intact", () => {
  assert.match(server,/version: "5\.2\.0"/);
  assert.match(html,/v5\.2 alpha playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
});

console.log(`${passed}/6 v5.2 tests passed.`);
