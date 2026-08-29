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

test("v7.8 adds a saved deck management overview with concrete readiness states", () => {
  assert.match(app,/function renderSavedDeckManager\(currentDeck\)/);
  assert.match(app,/MY DECKS/);
  assert.match(app,/FORMAT READY/);
  assert.match(app,/OWNED READY/);
  assert.match(app,/MISSING \$\{owned\.missingCopies\}/);
  assert.match(app,/LOBBY DECK/);
});

test("v7.8 tracks saved edit timestamps without invalidating legacy local decks", () => {
  assert.match(app,/updatedAt:Number\(deck\.updatedAt\) \|\| null/);
  assert.match(app,/function deckLastEditedLabel\(deck, now = Date\.now\(\)\)/);
  assert.match(app,/Legacy save/);
  assert.match(app,/deck\.updatedAt = now/);
  assert.match(app,/Last edited/);
});

test("v7.8 supports explicit open duplicate rename and delete deck management", () => {
  assert.match(app,/function openManagedDeck\(deckId\)/);
  assert.match(app,/function duplicateCustomDeck\(sourceId\)/);
  assert.match(app,/function deleteCustomDeck\(deckId\)/);
  assert.match(app,/data-deck-manage-open=/);
  assert.match(app,/data-deck-manage-duplicate=/);
  assert.match(app,/data-deck-manage-rename=/);
  assert.match(app,/data-deck-manage-delete=/);
});

test("v7.8 keeps cross-deck management behind the v7.7 unsaved-work guard", () => {
  assert.match(app,/guardUnsavedDeck\(current, 'open another saved deck'\)/);
  assert.match(app,/guardUnsavedDeck\(current, 'duplicate a saved deck'\)/);
  assert.match(app,/guardUnsavedDeck\(current, 'delete a saved deck'\)/);
  assert.match(app,/Delete “\$\{deck\.name\}”\?/);
});

test("v7.8 gives saved deck management a responsive swipe rail", () => {
  assert.match(css,/\/\* v7\.8 saved deck management polish \*\//);
  assert.match(css,/\.saved-deck-manager/);
  assert.match(css,/\.saved-deck-status \.ready/);
  assert.match(css,/\.saved-deck-actions/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.saved-deck-rail[\s\S]*grid-auto-flow:column/);
});

test("v7.8 stays meta-UX-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.8\.0"/);
  assert.match(html,/v7\.8 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.8 tests passed.`);
