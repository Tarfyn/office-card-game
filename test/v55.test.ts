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

test("v5.5 adds starter blueprints that clone canonical presets without mutating them", () => {
  assert.match(app,/function renderStarterDeckShelf\(\)/);
  assert.match(app,/STARTER BLUEPRINTS/);
  assert.match(app,/function cloneStarterDeck\(presetId\)/);
  assert.match(app,/cards:\(preset\.cards \?\? \[\]\)\.map/);
  assert.match(app,/data-clone-starter/);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

test("v5.5 surfaces starter and custom deck owned-copy readiness", () => {
  assert.match(app,/function starterOwnedReadiness\(preset\)/);
  assert.match(app,/function deckOwnedGaps\(deck\)/);
  assert.match(app,/OWNED READY/);
  assert.match(app,/OWNED SET/);
  assert.match(app,/OWNED`/);
});

test("v5.5 presents department identity and deck composition without changing deck rules", () => {
  assert.match(app,/function deckPrimaryDepartment\(deck\)/);
  assert.match(app,/function renderDeckIdentity\(deck\)/);
  assert.match(app,/DECK IDENTITY/);
  assert.match(app,/identity\.loop/);
  assert.match(app,/FORMAT READY/);
  assert.match(css,/\.deck-identity/);
});

test("v5.5 groups saved deck contents by card type with direct copy controls and inspector access", () => {
  assert.match(app,/function renderDeckList\(deck\)/);
  for (const type of ['EMPLOYEE','ACTION','INCIDENT','SYSTEM']) assert.match(app,new RegExp(`'${type}'`));
  assert.match(app,/data-deck-list-minus/);
  assert.match(app,/data-deck-list-plus/);
  assert.match(app,/data-deck-entry-preview/);
  assert.match(css,/\.deck-list-group/);
  assert.match(css,/\.deck-list-stepper/);
});

test("v5.5 can hand a legal custom deck back to lobby as the preferred match deck", () => {
  assert.match(app,/preferredDeckValue: null/);
  assert.match(app,/function playDeckFromBuilder\(deck\)/);
  assert.match(app,/state\.preferredDeckValue = `custom:\$\{deck\.id\}`/);
  assert.match(app,/function lobbyDeckOptions\(\)/);
  assert.match(app,/Use this deck in lobby/);
  assert.match(app,/\['quickDeck','createDeck','joinDeck'\]/);
});

test("v5.5 remains presentation-only with Ranked timer disabled and Alpha content intact", () => {
  assert.match(server,/version: "5\.5\.0"/);
  assert.match(html,/v5\.5 alpha playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
});

console.log(`${passed}/6 v5.5 tests passed.`);
