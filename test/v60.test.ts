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

test("v6.0 carries starter department identity onto both live player boards", () => {
  assert.match(app,/function departmentThemeClass\(department\)/);
  assert.match(app,/function roomDepartmentForPlayer\(playerId\)/);
  assert.match(app,/player-department-mark/);
  assert.match(app,/roomPlayerTitle\(player\.id\)/);
  assert.doesNotMatch(app,/roomDeckNameForPlayer\(player\.id\)/);
  assert.match(app,/player-board \$\{own \? 'own-board' : 'opponent-board'\}[\s\S]*?\$\{esc\(departmentThemeClass\(department\)\)\}/);
  assert.match(css,/\.player-board\.dept-customer_service/);
  assert.match(css,/\.player-board\.dept-production/);
});

test("v6.0 uses one compact rarity signal across collection preview, catalog and booster reveals", () => {
  assert.match(app,/function raritySignal\(def, tierOverride = null, compact = false\)/);
  assert.match(app,/class="rarity-pips"/);
  assert.match(app,/\$\{raritySignal\(def\)\}/);
  assert.match(app,/\$\{raritySignal\(def, tier, true\)\}/);
  assert.match(css,/\.rarity-signal\.tier-t3/);
  assert.match(css,/\.rarity-pips b\.on/);
});

test("v6.0 renders genuinely empty hands instead of a phantom opponent card back", () => {
  assert.doesNotMatch(app,/Math\.max\(player\.handCount, 1\)/);
  assert.match(app,/const cards = handCount > 0 \?/);
  assert.match(app,/Opponent hand is empty/);
  assert.match(app,/Your hand is empty/);
  assert.match(css,/\.hand-empty-state/);
});

test("v6.0 gives collection, history and archive intentional empty states with recovery", () => {
  assert.match(app,/collection-empty-state/);
  assert.match(app,/id="resetCollectionFilters"/);
  assert.match(app,/id="resetHistoryFilters"/);
  assert.match(app,/ARCHIVE CLEAR/);
  assert.match(app,/state\.collectionDepartment='ALL'/);
  assert.match(app,/state\.historyFilter=\{ mode:'ALL', outcome:'ALL' \}/);
  assert.match(css,/\.surface-empty-state/);
});

test("v6.0 polishes connection, waiting and match-result presentation without new game state", () => {
  assert.match(app,/class="connection-stage"/);
  assert.match(app,/CONNECTING TO OFFICE/);
  assert.match(app,/waiting-room-kicker/);
  assert.match(app,/match-result-panel \$\{esc\(tone\)\} \$\{esc\(departmentThemeClass\(mine\.department\)\)\}/);
  assert.match(css,/@keyframes office-loader/);
  assert.match(css,/\.match-result-panel\.dept-marketing/);
});

test("v6.0 remains a presentation-only Alpha release with content and Ranked timer unchanged", () => {
  assert.match(server,/version: "6\.0\.0"/);
  assert.match(html,/v6\.0 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v6.0 tests passed.`);
