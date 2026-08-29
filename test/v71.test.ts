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

test("v7.1 collection search indexes rules, flavor, IDs, teams, ranks and tags while preserving typing focus", () => {
  assert.match(app,/function collectionSearchText\(def\)/);
  assert.match(app,/def\?\.rulesText/);
  assert.match(app,/def\?\.flavorText/);
  assert.match(app,/def\?\.id/);
  assert.match(app,/def\?\.team/);
  assert.match(app,/def\?\.rank/);
  assert.match(app,/\.\.\.\(def\?\.tags \?\? \[\]\)/);
  assert.match(app,/function updateCollectionSearch\(value\)[\s\S]*focus\(\{ preventScroll:true \}\)[\s\S]*setSelectionRange/);
});

test("v7.1 adds explicit rarity and engine-tag filters with human-readable department labels", () => {
  assert.match(app,/collectionRarity: 'ALL'/);
  assert.match(app,/collectionTag: 'ALL'/);
  assert.match(app,/id="collectionRarity"/);
  assert.match(app,/id="collectionTag"/);
  assert.match(app,/function collectionDepartmentLabel\(department\)/);
  assert.match(app,/sandboxRarityTier\(def\) !== state\.collectionRarity/);
  assert.match(app,/\(def\.tags \?\? \[\]\)\.includes\(state\.collectionTag\)/);
});

test("v7.1 exposes one-click engine shortcuts and removable active filter chips", () => {
  assert.match(app,/collection-tag-shortcuts/);
  assert.match(app,/ENGINE SHORTCUTS/);
  assert.match(app,/data-collection-tag=/);
  assert.match(app,/function activeCollectionFilters\(\)/);
  assert.match(app,/data-clear-collection-filter=/);
  assert.match(app,/id="clearAllCollectionFilters"/);
  assert.match(css,/\.collection-active-filters/);
});

test("v7.1 collection preview makes tags actionable and links related engine cards", () => {
  assert.match(app,/function relatedCollectionCards\(def, limit = 5\)/);
  assert.match(app,/sharedTags\.length \* 4/);
  assert.match(app,/data-preview-tag=/);
  assert.match(app,/RELATED CARDS/);
  assert.match(app,/data-related-card=/);
  assert.match(app,/collection-card-context/);
  assert.match(css,/\.related-card-panel/);
  assert.match(css,/\.collection-preview-tags\.interactive button/);
});

test("v7.1 discovery controls stay responsive instead of recreating the v6.8 overlap class of bug", () => {
  assert.match(css,/\/\* v7\.1 card discovery \+ information polish \*\//);
  assert.match(css,/\.collection-filters[\s\S]*grid-template-columns:minmax\(210px,1\.45fr\) repeat\(3,minmax\(112px,1fr\)\)/);
  assert.match(css,/\.collection-filters input,[\s\S]*min-width:0/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.collection-filters \{ grid-template-columns:1fr 1fr; \}/);
  assert.match(css,/@media \(max-width:480px\)[\s\S]*\.collection-filters \{ grid-template-columns:1fr; \}/);
});

test("v7.1 stays presentation/discovery-only with Alpha content and Ranked timer unchanged", () => {
  assert.match(server,/version: "7\.1\.0"/);
  assert.match(html,/v7\.1 Alpha Playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card:any)=>Boolean(card.flavorText)).length,cards.length);
  assert.equal(decks.length,5);
  for (const deck of decks) assert.equal(deck.cards.reduce((sum:number, entry:any)=>sum+entry.copies,0),40);
});

console.log(`${passed}/6 v7.1 tests passed.`);
