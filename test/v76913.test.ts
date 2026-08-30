import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const app=root("public/app.js");
const css=root("public/styles.css");
const i18n=root("public/i18n.js");
const de=root("public/locales/de.js");
const audit=root("scripts/localization-audit.mjs");
const server=root("server/server.mjs");
const html=root("public/index.html");
const readme=root("README.md");
const settings=JSON.parse(root("data/match-settings.json"));
const polish=css.slice(css.lastIndexOf("/* v7.69.13 — mobile slot parity, physical piles + live-card lobby showcase */"));

function between(source:string,start:string,end:string){ const a=source.indexOf(start),b=source.indexOf(end,a+start.length); assert.ok(a>=0&&b>a); return source.slice(a,b); }

test("v7.69.13 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.15");
  assert.match(server,/version: "7\.69\.15"/);
  assert.match(server,/version:"7\.69\.15"/);
  assert.match(server,/Office Card Game v7\.69\.15 server/);
  assert.match(html,/v7\.69\.15 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.13 — Localization \+ Mobile Geometry \+ Showcase Polish/);
  assert.match(pkg.scripts.test,/dist\/test\/v76913\.test\.js/);
});

test("mobile employee and support lanes share one 5:7 card geometry",()=>{
  assert.match(polish,/opponent-board \{ padding:var\(--player-outer-reserve\) 20px 0 !important; \}/);
  assert.match(polish,/own-board \{ padding:0 20px var\(--player-outer-reserve\) !important; \}/);
  assert.match(polish,/slots\.employee-row[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\) !important/);
  assert.match(polish,/slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,calc\(\(100% - 8px\) \/ 5\)\)\) !important/);
  assert.match(polish,/employee-row > \.card,[\s\S]*?width:100% !important;[\s\S]*?height:auto !important;[\s\S]*?aspect-ratio:5\/7 !important/);
});

test("desktop and 4K piles emphasize the physical card while empty Archive stays compact",()=>{
  assert.match(polish,/@media \(min-width:761px\) and \(min-height:601px\)[\s\S]*?board-resource-row \{[\s\S]*?width:96px/);
  assert.match(polish,/deck-stack-visual,[\s\S]*?archive-stack-visual \{[\s\S]*?width:66px;[\s\S]*?height:92px/);
  assert.match(polish,/archive-compact\.is-empty summary \{[\s\S]*?min-height:34px/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?deck-stack-visual,[\s\S]*?archive-stack-visual \{ width:86px; height:120px; \}/);
});

test("Lobby showcase renderer remains a single shared helper",()=>{
  const helper=between(app,"function renderLobbyLiveCardFace", "function renderLobbyDeckShowcase");
  assert.match(helper,/renderCatalogCardFace\(def/);
  const showcase=between(app,"function renderLobbyDeckShowcase", "function renderLobbyDeckPrep");
  assert.match(showcase,/renderLobbyLiveCardFace\(entry\.def\)/);
});

test("German match localization covers phase, mulligan, slot and inspector surfaces",()=>{
  for (const phrase of ["OPENING HANDS","Keep this hand","Opening hand confirmed","RIGHT-CLICK TO PIN INSPECTOR","Build your board","Choose your attacks","ARCHIVED"]) {
    assert.ok(de.includes(JSON.stringify(phrase).slice(0,-1)), `missing German phrase anchor ${phrase}`);
  }
  assert.match(i18n,/\^YOUR \(START\|DRAW\|MAIN\|BATTLE\|END\|MULLIGAN\) PHASE\$/);
  assert.match(i18n,/\^OPPONENT \(START\|DRAW\|MAIN\|BATTLE\|END\|MULLIGAN\) PHASE\$/);
  assert.match(i18n,/\^EMPLOYEE \(\\d\+\)\$/);
  assert.match(i18n,/\^SUPPORT \(\\d\+\)\$/);
  assert.match(audit,/requiredMatchPhrases/);
  assert.match(audit,/match UI anchors covered/);
});

test("v7.69.12 interaction gains remain intact",()=>{
  assert.match(app,/data-direct-attack-board="1"/);
  assert.match(app,/function renderLobbyLiveCardFace/);
  assert.match(css,/\/\* v7\.69\.12 — centered hover preview, board-native placement \+ compact physical piles \*\//);
});

test("ranked timer remains disabled",()=>{
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
});

console.log(`\n${passed}/${passed} v7.69.13 tests passed.`);
