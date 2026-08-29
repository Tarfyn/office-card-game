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

test("v7.5 derives engine coverage only from existing deck tags", () => {
  assert.match(app,/function deckTagCoverage\(deck\)/);
  assert.match(app,/for \(const tag of def\.tags \?\? \[\]\)/);
  assert.match(app,/uniqueCards:item\.cardIds\.size/);
  assert.match(app,/Unique cards \+ total copies · existing card tags only/);
  assert.doesNotMatch(app,/deckStrengthScore|synergyScore|roleScore/);
});

test("v7.5 distinguishes connected packages from informational singleton signals", () => {
  assert.match(app,/item\.uniqueCards >= 2/);
  assert.match(app,/item\.uniqueCards === 1/);
  assert.match(app,/ENGINE COVERAGE/);
  assert.match(app,/SINGLE-CARD SIGNALS/);
  assert.match(app,/Context only — not treated as a deck issue/);
});

test("v7.5 package actions support in-deck inspection and full-catalog expansion", () => {
  assert.match(app,/data-deck-package-tag=/);
  assert.match(app,/data-deck-expand-tag=/);
  assert.match(app,/kind === 'PACKAGE'/);
  assert.match(app,/state\.collectionDeckFilter = 'IN_DECK'/);
  assert.match(app,/focusCollectionFromDeck\('PACKAGE'/);
  assert.match(app,/focusCollectionFromDeck\('TAG'/);
});

test("v7.5 surfaces bridge cards without inventing a second inspector", () => {
  assert.match(app,/function deckBridgeCards\(deck, connectedTags, limit = 5\)/);
  assert.match(app,/item\.bridgeTags\.length >= 2/);
  assert.match(app,/BRIDGE CARDS/);
  assert.match(app,/data-deck-bridge-preview=/);
  assert.match(app,/state\.collectionPreviewId=button\.dataset\.deckBridgePreview/);
  assert.doesNotMatch(app,/bridge-card-modal|bridgeInspector/);
});

test("v7.5 engine coverage stays compact and mobile swipe-friendly", () => {
  assert.match(css,/\/\* v7\.5 engine coverage \+ bridge-card polish \*\//);
  assert.match(css,/\.engine-package-grid/);
  assert.match(css,/\.engine-bridge-list/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*grid-auto-flow:column/);
  assert.match(css,/scroll-snap-type:x proximity/);
});

test("v7.5 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.5\.0"/);
  assert.match(html,/v7\.5 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.5 tests passed.`);
