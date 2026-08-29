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

test("v6.7 adds a compact game-facing live match feed while keeping raw events in playtest tools", () => {
  assert.match(app,/function renderMatchFeed\(match\)/);
  assert.match(app,/LIVE ACTIVITY/);
  assert.match(app,/Match feed/);
  assert.match(app,/\$\{renderMatchFeed\(match\)\}/);
  assert.match(app,/Raw engine event log/);
  assert.match(css,/\.match-feed/);
});

test("v6.7 explains Battle resolution with current powers and prevention outcomes", () => {
  assert.match(app,/function battleFeedDetail\(event\)/);
  assert.match(app,/attackerPower/);
  assert.match(app,/defenderPower/);
  assert.match(app,/replacedOrPreventedIds/);
  assert.match(app,/survived prevention/);
  assert.match(app,/Both Employees destroyed/);
});

test("v6.7 turns projected engine events into readable player-facing activity", () => {
  assert.match(app,/case 'INCIDENT_SET'/);
  assert.match(app,/set an Incident/);
  assert.match(app,/case 'ATTACK_TARGET_REDIRECTED'/);
  assert.match(app,/case 'REPUTATION_LOSS_REDUCED'/);
  assert.match(app,/case 'CHAIN_ITEM_NEGATED'/);
  assert.match(app,/case 'GAME_ENDED'/);
});

test("v6.7 preserves hidden information in the feed by falling back to generic labels", () => {
  assert.match(app,/function feedCardName\(ref, fallback = 'card'\)/);
  assert.match(app,/label === 'Face-down Support'/);
  assert.match(app,/event\.cardInstanceId \? `\$\{actor\} set \$\{card\}` : `\$\{actor\} set an Incident`/);
  assert.match(app,/event\.cardInstanceId \? `\$\{actor\} drew \$\{card\}` : `\$\{actor\} drew a card`/);
  assert.doesNotMatch(app,/definitionId.*match-feed|match-feed.*definitionId/);
});

test("v6.7 keeps the feed compact, inspectable and mobile/reduced-motion friendly", () => {
  assert.match(app,/MATCH_FEED_LIMIT = 5/);
  assert.match(app,/data-card-info=/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.match-feed-list/);
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.match-feed-item/);
});

test("v6.7 remains presentation-only with Alpha content, starter sizes and Ranked timer unchanged", () => {
  assert.match(server,/version: "6\.7\.0"/);
  assert.match(html,/v6\.7 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v6.7 tests passed.`);
