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

test("v7.2 adds current-deck status as a first-class collection filter", () => {
  assert.match(app,/collectionDeckFilter: 'ALL'/);
  assert.match(app,/id="collectionDeckFilter"/);
  assert.match(app,/IN_DECK/);
  assert.match(app,/NOT_IN_DECK/);
  assert.match(app,/BELOW_LIMIT/);
  assert.match(app,/deckCopiesNow = deckCopies\(deck, def\.id\)/);
  assert.match(app,/state\.collectionDeckFilter === 'IN_DECK'/);
  assert.match(app,/state\.collectionDeckFilter === 'BELOW_LIMIT'/);
});

test("v7.2 makes deck analysis signals actionable collection shortcuts", () => {
  assert.match(app,/Tap a signal to focus the collection/);
  assert.match(app,/data-deck-filter-type=/);
  assert.match(app,/data-deck-filter-department=/);
  assert.match(app,/data-deck-filter-tag=/);
  assert.match(app,/function focusCollectionFromDeck\(kind, value\)/);
  assert.match(app,/resetCollectionFilters\(\)/);
  assert.match(app,/scrollIntoView\(\{ behavior:'smooth', block:'start' \}\)/);
});

test("v7.2 surfaces transparent engine-fit candidates without changing deck rules", () => {
  assert.match(app,/function deckEngineFits\(deck, limit = 5\)/);
  assert.match(app,/sharedTags\.length \* 4/);
  assert.match(app,/candidate\.department === primary \? 3 : 0/);
  assert.match(app,/item\.copies < item\.ceiling/);
  assert.match(app,/ENGINE FITS/);
  assert.match(app,/Shared top tags \+ primary department · no auto-building/);
  assert.match(app,/data-deck-fit-preview=/);
  assert.match(app,/data-deck-fit-add=/);
});

test("v7.2 keeps copy ceilings and deck-size limits authoritative in quick-add flow", () => {
  assert.match(app,/const ceiling = deckCopyCeiling\(candidate\.id\)/);
  assert.match(app,/const full = deckCardCount\(deck\) >= Number\(state\.format\.deckSize \?\? 40\)/);
  assert.match(app,/full \|\| copies>=ceiling \? 'disabled'/);
  assert.match(app,/setDeckCopies\(deck,id,deckCopies\(deck,id\)\+1\)/);
  assert.match(app,/collection-card[\s\S]*in-current-deck/);
  assert.match(app,/deck-copy-maxed/);
});

test("v7.2 deckbuilding workflow remains responsive on collection and mobile surfaces", () => {
  assert.match(css,/\/\* v7\.2 deckbuilding workflow \+ engine-fit polish \*\//);
  assert.match(css,/\.collection-filters \{[\s\S]*repeat\(4,minmax\(108px,1fr\)\)/);
  assert.match(css,/\.deck-engine-fits/);
  assert.match(css,/\.deck-engine-fit-list/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*grid-auto-flow:column/);
  assert.match(css,/scroll-snap-type:x proximity/);
});

test("v7.2 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.2\.0"/);
  assert.match(html,/v7\.2 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.2 tests passed.`);
