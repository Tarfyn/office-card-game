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

test("v7.6 adds explicit one-copy swap state and deck-list entry points", () => {
  assert.match(app,/deckSwapSourceId: null/);
  assert.match(app,/function beginDeckSwap\(deck, sourceId\)/);
  assert.match(app,/data-deck-swap-source=/);
  assert.match(app,/SWAP 1 COPY/);
  assert.match(app,/40-card count stays intact/);
});

test("v7.6 performs the replacement as one saved deck mutation", () => {
  assert.match(app,/function writeDeckCopies\(deck, definitionId, copies\)/);
  assert.match(app,/writeDeckCopies\(deck, sourceId, deckCopies\(deck, sourceId\) - 1\)/);
  assert.match(app,/writeDeckCopies\(deck, targetId, deckCopies\(deck, targetId\) \+ 1\)/);
  assert.match(app,/sortDeckEntries\(deck\);\n  saveCustomDecks\(\);\n  state\.deckSwapSourceId = null/);
  assert.match(app,/Swapped 1×/);
});

test("v7.6 swap targets reuse format and owned-copy ceilings", () => {
  assert.match(app,/function deckSwapTargetStatus\(deck, targetId\)/);
  assert.match(app,/const ceiling = deckCopyCeiling\(targetId\)/);
  assert.match(app,/if \(copies >= ceiling\)/);
  assert.match(app,/Owned-copy or format limit reached/);
  assert.match(app,/data-deck-swap-target=/);
});

test("v7.6 keeps replacement choice manual and uses the existing Collection", () => {
  assert.match(app,/resetCollectionFilters\(\);\n  state\.collectionDeckFilter = 'BELOW_LIMIT'/);
  assert.match(app,/collection-swap-control/);
  assert.match(app,/SWAP IN/);
  assert.match(app,/cancelDeckSwap/);
  assert.doesNotMatch(app,/autoSwap|autoReplace|bestReplacement/);
});

test("v7.6 gives swap mode a compact responsive treatment", () => {
  assert.match(css,/\/\* v7\.6 atomic deck swap \+ refinement polish \*\//);
  assert.match(css,/\.deck-swap-bar/);
  assert.match(css,/\.collection-swap-control/);
  assert.match(css,/\.deck-list-row\.swap-source-row/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.deck-swap-bar \{ position:sticky/);
});

test("v7.6 stays workflow-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.6\.0"/);
  assert.match(html,/v7\.6 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.6 tests passed.`);
