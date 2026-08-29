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

test("v7.3 adds objective deck-completion diagnostics without a strength score", () => {
  assert.match(app,/function deckCompletionStatus\(deck\)/);
  assert.match(app,/openSlots = Math\.max\(0, deckSize - total\)/);
  assert.match(app,/copyIssues = \(deck\?\.cards \?\? \[\]\)\.filter/);
  assert.match(app,/missingOwned = ownedGaps\.reduce/);
  assert.match(app,/DECK CHECK/);
  assert.match(app,/Objective checks only · no deck-strength score\./);
});

test("v7.3 makes unfinished deck size actionable through the existing collection filters", () => {
  assert.match(app,/data-deck-check-action="\$\{status\.openSlots \? 'ADDABLE' : 'IN_DECK'\}"/);
  assert.match(app,/Find addable cards/);
  assert.match(app,/button\.dataset\.deckCheckAction === 'ADDABLE' \? 'BELOW_LIMIT' : 'IN_DECK'/);
  assert.match(app,/focusCollectionFromDeck\('DECK'/);
});

test("v7.3 separates format legality from owned-copy readiness", () => {
  assert.match(app,/OWNED SET/);
  assert.match(app,/Required in Owned copies mode\./);
  assert.match(app,/Collection check only in All Alpha cards mode\./);
  assert.match(app,/status\.missingOwned/);
  assert.match(app,/status\.ownedGaps\.length/);
});

test("v7.3 missing-copy rows reuse the existing card preview instead of adding a second inspector", () => {
  assert.match(app,/data-deck-gap-preview=/);
  assert.match(app,/state\.collectionPreviewId=button\.dataset\.deckGapPreview/);
  assert.match(app,/markCollectionCardSeen\(button\.dataset\.deckGapPreview\)/);
  assert.match(app,/document\.querySelector\('\.collection-preview'\)\?\.scrollIntoView/);
});

test("v7.3 deck-check presentation remains compact and mobile responsive", () => {
  assert.match(css,/\/\* v7\.3 deck quality \+ completion polish \*\//);
  assert.match(css,/\.deck-completion-grid \{[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.deck-completion-progress/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.deck-completion-grid \{ grid-template-columns:1fr; \}/);
  assert.match(css,/\.deck-owned-gaps > div \{ grid-auto-flow:column;[\s\S]*scroll-snap-type:x proximity/);
});

test("v7.3 stays presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.3\.0"/);
  assert.match(html,/v7\.3 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.3 tests passed.`);
