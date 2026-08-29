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

test("v6.2 response windows explain the visible effect source and targets", () => {
  assert.match(app,/function responseWindowContext\(match\)/);
  assert.match(app,/function renderResponseContext\(match\)/);
  assert.match(app,/OPPONENT EFFECT/);
  assert.match(app,/Target →/);
  assert.match(css,/\.response-context/);
});

test("v6.2 chain stack uses player-facing labels and clearer state markers", () => {
  assert.match(app,/item\.controllerId === match\.viewerId \? 'YOU' : 'OPPONENT'/);
  assert.match(app,/No visible target/);
  assert.match(app,/NEGATED/);
  assert.match(app,/DELAYED/);
  assert.match(css,/\.chain-item\.negated/);
  assert.match(css,/\.chain-item\.delayed/);
});

test("v6.2 derives resolution moments only from existing engine events", () => {
  assert.match(app,/function resolutionOutcomeEvent\(\)/);
  assert.match(app,/CHAIN_ITEM_NEGATED/);
  assert.match(app,/CHAIN_ITEM_DELAYED/);
  assert.match(app,/ACTION_RESOLVED/);
  assert.match(app,/CHAIN_RESOLVED/);
  assert.match(app,/function renderResolutionMoment\(\)/);
  assert.doesNotMatch(app,/clientResolutionState/);
});

test("v6.2 gives resolved, negated and delayed sources restrained board feedback", () => {
  assert.match(app,/classes\.add\('cue-resolved'\)/);
  assert.match(app,/classes\.add\('cue-negated'\)/);
  assert.match(app,/classes\.add\('cue-delayed'\)/);
  assert.match(css,/effect-resolved-v62/);
  assert.match(css,/effect-negated-v62/);
  assert.match(css,/effect-delayed-v62/);
  assert.match(css,/prefers-reduced-motion/);
});

test("v6.2 pass priority reads as an explicit no-response choice", () => {
  assert.match(app,/class="pass-response"/);
  assert.match(app,/>PASS</);
  assert.match(app,/No response/);
  assert.match(css,/\.pass-response small/);
});

test("v6.2 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "6\.2\.0"/);
  assert.match(html,/v6\.2 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v6.2 tests passed.`);
