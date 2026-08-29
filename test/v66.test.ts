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

test("v6.6 adds a compact live-resource quick read to each existing player header", () => {
  assert.match(app,/function renderPlayerVitals\(player\)/);
  assert.match(app,/class="player-vitals" aria-label="Live match resources"/);
  assert.match(app,/REP<\/small><b>\$\{esc\(player\.reputation\)\}/);
  assert.match(app,/CAP<\/small><b>\$\{esc\(player\.availableCapacity\)\}\/\$\{esc\(player\.maxCapacity\)\}/);
  assert.match(app,/HAND<\/small><b>\$\{esc\(player\.handCount\)\}\/8/);
  assert.match(css,/\.player-vitals/);
});

test("v6.6 makes Reputation reference the actual Alpha start and loss thresholds without changing them", () => {
  assert.match(app,/START 20 · LOSS AT 0/);
  assert.match(app,/Starting Reputation: 20/);
  assert.match(app,/left:66\.6667%/);
  assert.match(css,/\.reputation-resource\.tone-critical/);
  assert.match(css,/\.reputation-resource\.tone-pressure/);
});

test("v6.6 makes Capacity and hand limit explicit in the resource tray", () => {
  assert.match(app,/AVAILABLE \/ MAX/);
  assert.match(app,/\$\{player\.handCount\}<\/strong><small>\/ 8<\/small>/);
  assert.match(app,/HAND LIMIT/);
  assert.match(app,/SLOTS OPEN/);
  assert.match(css,/\.hand-meter/);
});

test("v6.6 surfaces low-deck pressure from existing deckCount only", () => {
  assert.match(app,/function deckHudState\(deckCount\)/);
  assert.match(app,/DECK CRITICAL/);
  assert.match(app,/DECK LOW/);
  assert.match(app,/deckHudState\(player\.deckCount\)\.tone/);
  assert.match(css,/\.deck-pile\.pressure/);
  assert.match(css,/\.deck-pile\.critical/);
  assert.doesNotMatch(app,/clientDeckCount|localDeckCount/);
});

test("v6.6 keeps the new HUD compact on mobile and respects reduced motion", () => {
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.player-vitals/);
  assert.match(css,/\.player-vitals \{ order:3; width:100%/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.player-vitals/);
});

test("v6.6 remains presentation-only with Alpha content, starter sizes and Ranked timer unchanged", () => {
  assert.match(server,/version: "6\.6\.0"/);
  assert.match(html,/v6\.6 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v6.6 tests passed.`);
