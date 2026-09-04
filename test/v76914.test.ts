import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const rootPath=(name:string)=>fileURLToPath(new URL(`../../${name}`,import.meta.url));
const pkg=JSON.parse(root("package.json"));
const app=root("public/app.js");
const css=root("public/styles.css");
const server=root("server/server.mjs");
const html=root("public/index.html");
const readme=root("README.md");
const polish=css.slice(css.lastIndexOf("/* v7.69.14 — provisional Classic Office halfboard + mobile parity + pile/showcase polish */"));

function between(source:string,start:string,end:string){ const a=source.indexOf(start),b=source.indexOf(end,a+start.length); assert.ok(a>=0&&b>a); return source.slice(a,b); }

test("v7.69.17 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.53");
  assert.match(server,/version: "7\.69\.53"/);
  assert.match(server,/version:"7\.69\.53"/);
  assert.match(server,/Office Card Game v7\.69\.53 server/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.17 — Cosmetic Loadout Foundation \+ Visual Root Fixes/);
  assert.match(pkg.scripts.test,/dist\/test\/v76914\.test\.js/);
});

test("each seat has an independent provisional board-skin slot and opponent rendering rotates it 180 degrees",()=>{
  assert.ok(readFileSync(rootPath("public/cosmetics/boards/classic-office.webp")).byteLength > 0);
  assert.match(polish,/board-skin-classic-office \{ --board-skin-image:url\('\/cosmetics\/boards\/classic-office\.webp'\); \}/);
  assert.match(polish,/own-board::before \{ transform:none; \}/);
  assert.match(polish,/opponent-board::before \{ transform:rotate\(180deg\); \}/);
  assert.match(app,/function roomBoardSkinId\(playerId\)/);
  assert.match(app,/hostCosmeticLoadout/);
  assert.match(app,/guestCosmeticLoadout/);
  assert.match(app,/data-board-skin=/);
  assert.doesNotMatch(app,/board-skin-picker|selectedBoardSkin/);
  const room=root("src/room.ts");
  assert.match(room,/DEFAULT_BOARD_SKIN_ID = "classic-office"/);
  assert.match(room,/hostBoardSkinId: string/);
  assert.match(room,/guestBoardSkinId: string \| null/);
  assert.match(room,/boardSkinId: DEFAULT_BOARD_SKIN_ID/);
});

test("mobile Support row is centered on the same five-column gameplay axis",()=>{
  assert.match(polish,/slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,calc\(\(100% - 8px\) \/ 5\)\) !important/);
  assert.match(polish,/justify-content:center !important/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\)[\s\S]*?card-art-stage[\s\S]*?flex:1 1 auto/);
  assert.match(polish,/card-rules-mini,[\s\S]*?card-tags,[\s\S]*?card-detail-row \{ display:none !important; \}/);
});

test("desktop and 4K Deck/Archive rails prioritize a larger physical stack",()=>{
  assert.match(polish,/@media \(min-width:761px\) and \(min-height:601px\)[\s\S]*?board-resource-row \{ width:112px/);
  assert.match(polish,/deck-stack-visual,[\s\S]*?archive-stack-visual \{ width:78px; height:109px; \}/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?board-resource-row \{ width:164px/);
  assert.match(polish,/deck-stack-visual,[\s\S]*?archive-stack-visual \{ width:118px; height:165px; \}/);
});

test("Lobby showcase reuses the Deckbuilder catalog card face",()=>{
  const helper=between(app,"function renderLobbyLiveCardFace", "function renderLobbyDeckShowcase");
  assert.match(helper,/renderCatalogCardFace\(def,\{ artReady:Boolean\(def\.artId\), variantId \}\)/);
  const showcase=between(app,"function renderLobbyDeckShowcase", "function renderLobbyDeckPrep");
  assert.match(showcase,/renderLobbyLiveCardFace\(entry\.def(?:,entry\.variantId)?\)/);
  assert.match(polish,/desk-card-fan-item > \.catalog-card-face/);
  assert.match(polish,/pointer-events:auto/);
  assert.match(polish,/desk-card-fan-item:hover > \.catalog-card-face\.tier-t2/);
  assert.match(polish,/desk-card-fan-item:hover > \.catalog-card-face\.tier-t3/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?catalog-card-face\.tier-t3 \.catalog-art-stage::after/);
});

test("v7.69.13 localization and direct-attack work remain intact",()=>{
  assert.match(app,/data-direct-attack-board="1"/);
  assert.match(css,/\/\* v7\.69\.13 — mobile slot parity, physical piles \+ live-card lobby showcase \*\//);
  assert.match(css,/\/\* v7\.69\.12 — centered hover preview, board-native placement \+ compact physical piles \*\//);
});

console.log(`\n${passed}/${passed} v7.69.15 tests passed.`);
