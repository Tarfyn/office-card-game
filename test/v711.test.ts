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
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/economy.json",import.meta.url)),"utf8"));

test("v7.11 connects completed boosters back into normal collection discovery", () => {
  assert.match(app,/collectionPackFilter: 'ALL'/);
  assert.match(app,/function focusLastBoosterCollection\(kind = 'ALL'\)/);
  assert.match(app,/LAST_PACK_NEW/);
  assert.match(app,/New from last pack/);
  assert.match(app,/data-view-last-booster/);
  assert.match(app,/id="viewNewBoosterCards"/);
});

test("v7.11 shows saved-deck use and deck opportunities for inspected cards", () => {
  assert.match(app,/function savedDeckCardUse\(definitionId\)/);
  assert.match(app,/function renderCardDeckUse\(def, activeDeck\)/);
  assert.match(app,/DECK USE/);
  assert.match(app,/Used in \$\{esc\(usedDecks\)\} saved deck/);
  assert.match(app,/swap candidate/);
});

test("v7.11 routes card additions through the existing unsaved deck-edit flow", () => {
  assert.match(app,/function openCardInManagedDeck\(deckId, definitionId, \{ add = false \} = \{\}\)/);
  assert.match(app,/openManagedDeck\(deckId\)/);
  assert.match(app,/setDeckCopies\(deck, definitionId, deckCopies\(deck, definitionId\) \+ 1\)/);
  assert.match(app,/Save to keep this change/);
  assert.match(app,/data-card-deck-add=/);
});

test("v7.11 reuses rather than bypasses the existing full-deck swap flow", () => {
  assert.match(app,/Deck is full\. Use SWAP on a deck-list card/);
  assert.match(app,/Open to swap/);
  assert.match(app,/use SWAP on a deck-list card to replace one copy/);
  assert.match(app,/function swapDeckCopy\(deck, targetId\)/);
});

test("v7.11 keeps pack-to-deck UI compact and responsive", () => {
  assert.match(css,/\/\* v7\.11 booster → collection → deck flow polish \*\//);
  assert.match(css,/\.booster-deck-bridge/);
  assert.match(css,/\.card-deck-use-panel/);
  assert.match(css,/\.card-deck-use-list/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.card-deck-use-list[\s\S]*grid-auto-flow:column/);
});

test("v7.11 remains a UX-only release with economy tuning and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.11\.0"/);
  assert.match(html,/v7\.11 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  const tiers = Object.fromEntries(economy.rarityTiers.map((tier:any)=>[tier.id,[tier.scrapValue,tier.craftCost]]));
  assert.deepEqual(tiers,{ T0:[10,150], T1:[25,300], T2:[60,600], T3:[150,1200] });
});

console.log(`${passed}/6 v7.11 tests passed.`);
