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
const projection = readFileSync(fileURLToPath(new URL("../../src/projection.ts",import.meta.url)),"utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs",import.meta.url)),"utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html",import.meta.url)),"utf8");
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json",import.meta.url)),"utf8"));
const cards = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/cards.json",import.meta.url)),"utf8"));
const decks = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/decks.json",import.meta.url)),"utf8"));

test("v6.3 derives movement feedback only from existing projected engine events", () => {
  assert.match(app,/movementSignificant = new Set\(\['CARD_DRAWN','CARD_MOVED','CARD_ARCHIVED','CARD_REVEALED','DECK_SHUFFLED'\]\)/);
  assert.match(app,/function buildZoneCue\(events = \[\]\)/);
  assert.match(app,/state\.zoneCue = buildZoneCue\(freshMovement\)/);
  assert.doesNotMatch(app,/clientZoneState/);
});

test("v6.3 makes draws, returns and search-plus-shuffle sequences readable", () => {
  assert.match(app,/SEARCH COMPLETE/);
  assert.match(app,/DECK SHUFFLED/);
  assert.match(app,/kicker:'DRAW'/);
  assert.match(app,/kicker:'RETURNED'/);
  assert.match(app,/zoneTransitionChip\(player\.id, 'HAND'\)/);
  assert.match(app,/zoneTransitionChip\(player\.id, 'DECK'\)/);
});

test("v6.3 gives destination zones and visible moved cards restrained arrival feedback", () => {
  assert.match(app,/zonePulseClass\(player\.id, 'EMPLOYEE_FIELD'\)/);
  assert.match(app,/zonePulseClass\(player\.id, 'SUPPORT_FIELD'\)/);
  assert.match(app,/zonePulseClass\(player\.id, 'ARCHIVE'\)/);
  assert.match(app,/zoneCueClassForCard\(card\.instanceId\)/);
  assert.match(css,/\.card\.cue-zone-arrival/);
  assert.match(css,/\.archive-compact\.zone-transition-active/);
});

test("v6.3 keeps reveal and hidden-opponent movement bounded by projection redaction", () => {
  assert.match(app,/Visible to both players/);
  assert.match(app,/Visible to the permitted player/);
  assert.match(projection,/if \(event\.type === "CARD_DRAWN" && !isOwnerEvent\)/);
  assert.match(projection,/delete out\.cardInstanceId/);
  assert.match(projection,/if \(event\.type === "CARD_MOVED" && !isOwnerEvent\)/);
  assert.match(projection,/if \(to === "HAND" \|\| to === "DECK"\) delete out\.cardInstanceId/);
});

test("v6.3 supports mobile and reduced-motion movement feedback", () => {
  assert.match(css,/\.zone-transition-cue/);
  assert.match(css,/@media \(max-width:760px\)/);
  assert.match(css,/@keyframes zone-cue-v63/);
  assert.match(css,/@keyframes zone-arrival-v63/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/\.card\.cue-revealed/);
});

test("v6.3 remains presentation-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "6\.3\.0"/);
  assert.match(html,/v6\.3 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v6.3 tests passed.`);
