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
const decks = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/decks.json",import.meta.url)),"utf8"));

test("v7.4 makes capacity-curve buckets first-class collection drill-down filters", () => {
  assert.match(app,/collectionCost: 'ALL'/);
  assert.match(app,/function matchesCollectionCost\(def\)/);
  assert.match(app,/state\.collectionCost === '7' \? cost >= 7/);
  assert.match(app,/if \(!matchesCollectionCost\(def\)\) return false/);
  assert.match(app,/data-deck-filter-cost=/);
  assert.match(app,/focusCollectionFromDeck\('COST'/);
});

test("v7.4 reuses removable filter chips instead of adding another permanent dropdown", () => {
  assert.match(app,/filters\.push\(\{ id:'COST', label:collectionCostLabel\(state\.collectionCost\) \}\)/);
  assert.match(app,/if \(id === 'COST'\) state\.collectionCost = 'ALL'/);
  assert.match(app,/state\.collectionCost='ALL'/);
  assert.doesNotMatch(app,/id="collectionCost"/);
});

test("v7.4 adds objective unique-card and cost-band composition context", () => {
  assert.match(app,/let uniqueCards = 0/);
  assert.match(app,/if \(copies > 0\) uniqueCards \+= 1/);
  assert.match(app,/const costBands = \{ EARLY:0, MID:0, HIGH:0 \}/);
  assert.match(app,/cost <= 2/);
  assert.match(app,/cost <= 4/);
  assert.match(app,/stats\.uniqueCards\} unique/);
  assert.match(app,/COST 0–2/);
  assert.match(app,/COST 3–4/);
  assert.match(app,/COST 5\+/);
});

test("v7.4 capacity curve is clearly interactive and preserves the exact 7+ bucket", () => {
  assert.match(app,/cost-curve interactive/);
  assert.match(app,/Tap a cost to inspect matching cards/);
  assert.match(app,/cost===7\?'7\+':cost/);
  assert.match(css,/\/\* v7\.4 capacity curve \+ deck composition polish \*\//);
  assert.match(css,/\.cost-curve\.interactive > button/);
  assert.match(css,/\.cost-curve\.interactive > button\.active/);
});

test("v7.4 composition summary stays compact on desktop and mobile", () => {
  assert.match(css,/\.curve-band-summary \{[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width:480px\)[\s\S]*\.curve-title-row/);
  assert.match(css,/\.curve-band-summary span/);
});

test("v7.4 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.4\.0"/);
  assert.match(html,/v7\.4 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.4 tests passed.`);
