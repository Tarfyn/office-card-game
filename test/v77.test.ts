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

test("v7.7 tracks a saved checkpoint separately from working deck edits", () => {
  assert.match(app,/deckEditBaselines: \{\}/);
  assert.match(app,/deckEditHistory: \{\}/);
  assert.match(app,/function deckHasUnsavedChanges\(deck\)/);
  assert.match(app,/function checkpointDeckEdits\(deck/);
  assert.match(app,/function recordDeckEdit\(deck, mutate\)/);
});

test("v7.7 exposes save undo and reset controls with a clear dirty state", () => {
  assert.match(app,/function renderDeckEditSafety\(deck\)/);
  assert.match(app,/UNSAVED CHANGES/);
  assert.match(app,/id="undoDeckEdit"/);
  assert.match(app,/id="resetDeckEdits"/);
  assert.match(app,/id="saveDeckEdits"/);
  assert.match(app,/Save & use in lobby/);
});

test("v7.7 makes ordinary card edits undoable before persistence", () => {
  assert.match(app,/function setDeckCopies\(deck, definitionId, copies\)[\s\S]*recordDeckEdit\(deck/);
  assert.match(app,/function swapDeckCopy\(deck, targetId\)[\s\S]*recordDeckEdit\(deck/);
  assert.match(app,/recordDeckEdit\(deck, \(\) => \{ deck\.cards=\[\]; \}\)/);
  assert.match(app,/function undoDeckEdit\(deck\)/);
  assert.match(app,/applyDeckEditSnapshot\(deck, previous\)/);
});

test("v7.7 protects unsaved work when switching destructive builder contexts", () => {
  assert.match(app,/function guardUnsavedDeck\(deck, actionLabel = 'continue'\)/);
  assert.match(app,/Save or reset this deck before you/);
  assert.match(app,/guardUnsavedDeck\(deck, 'switch decks'\)/);
  assert.match(app,/guardUnsavedDeck\(deck, 'create another deck'\)/);
  assert.match(app,/guardUnsavedDeck\(deck, 'delete this deck'\)/);
  assert.match(app,/beforeunload/);
});

test("v7.7 gives edit safety a compact responsive treatment", () => {
  assert.match(css,/\/\* v7\.7 deck editing safety \+ history polish \*\//);
  assert.match(css,/\.deck-edit-safety/);
  assert.match(css,/\.deck-edit-safety\.dirty/);
  assert.match(css,/\.deck-edit-actions/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.deck-edit-safety \{ grid-template-columns:1fr/);
});

test("v7.7 stays builder-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.7\.0"/);
  assert.match(html,/v7\.7 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.7 tests passed.`);
