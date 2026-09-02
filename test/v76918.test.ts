import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const app=root("public/app.js");
const css=root("public/styles.css");
const server=root("server/server.mjs");
const i18n=root("public/i18n.js");
const index=root("public/index.html");
const en=root("public/locales/en.js");
const de=root("public/locales/de.js");
const polish=css.slice(css.lastIndexOf("/* v7.69.18 — archive direction + unified mobile mini live cards */"));

  test("v7.69.26 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.39");
  assert.match(pkg.scripts.test,/dist\/test\/v76918\.test\.js/);
  assert.match(pkg.scripts.test,/dist\/test\/v76921\.test\.js/);
  assert.match(server,/version: "7\.69\.39"/);
  assert.doesNotMatch(en,/v7\.69\.15/);
  assert.doesNotMatch(de,/v7\.69\.15/);
  assert.match(en,/meta: \{ title: "Office Card Game — v\{version\} Alpha Playtest" \}/);
  assert.match(index,/<title data-i18n-title="meta\.title">Office Card Game — Alpha Playtest<\/title>/);
  assert.match(i18n,/setDocumentTranslationParams/);
  assert.match(app,/setDocumentTranslationParams\(\{ version:health\.version \?\? '' \}\)/);
});

test("board Archive and played-card notifications opt into explicit live-card surfaces",()=>{
  assert.match(app,/function renderCard\(card, \{ selectable = false, handIndex = null, handCount = null, surface = '' \}/);
  assert.match(app,/surface \? `card-surface-\$\{surface\}`/);
  assert.match(app,/renderCard\(card, \{ surface:'board' \}\)/);
  assert.match(app,/renderCard\(c, \{ surface:'archive' \}\)/);
  assert.match(app,/renderCard\(card, \{ surface:'notification' \}\)/);
});

test("Archive expansion direction follows the halfboard on desktop",()=>{
  assert.match(app,/archive-compact \$\{own \? 'archive-own' : 'archive-opponent'\}/);
  assert.match(polish,/archive-opponent\[open\] \.archive-grid[\s\S]*top:calc\(100% \+ 8px\) !important;[\s\S]*bottom:auto !important/);
  assert.match(polish,/archive-own\[open\] \.archive-grid[\s\S]*top:auto !important;[\s\S]*bottom:calc\(100% \+ 8px\) !important/);
});

test("mobile keeps its viewport-safe Archive sheet",()=>{
  assert.match(css,/@media \(max-width:760px\)[\s\S]*archive-compact\[open\] \.archive-grid \{[\s\S]*position:fixed;[\s\S]*inset:54px 6px 54px/);
  assert.match(polish,/archive-compact\[open\] \.archive-grid \{[\s\S]*overscroll-behavior:contain/);
});

test("mobile board Archive and notification cards share one proportional mini anatomy",()=>{
  for (const surface of ['board','archive','notification']) assert.match(polish,new RegExp(`card\\.card-surface-${surface}`));
  assert.match(polish,/@media \(max-width:760px\), \(min-width:761px\) and \(max-width:1180px\) and \(max-height:600px\)/);
  assert.match(polish,/grid-template-rows:8% 18% 38% minmax\(0,1fr\) 8% !important/);
  assert.match(polish,/card-surface-archive:not\(\.face-down-support\) \.card-art-stage[\s\S]*height:100% !important/);
  assert.match(polish,/card-surface-notification:not\(\.face-down-support\) \.card-rules-mini[\s\S]*-webkit-line-clamp:2 !important/);
  assert.match(polish,/runtime-badge[\s\S]*font-size:2\.15px !important/);
});

test("short landscape sizes field cards from lane height and keeps 4K Deck pile 5:7",()=>{
  assert.match(css,/@media \(min-width:761px\) and \(max-width:1180px\) and \(max-height:600px\)[\s\S]*employee-row > \.card,[\s\S]*height:100% !important;[\s\S]*aspect-ratio:5\/7;[\s\S]*justify-self:center/);
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*deck-stack-visual \{ width:156px; height:218\.4px; \}/);
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*archive-stack-visual \{ width:118px; height:165px; \}/);
});

test("resource rail no longer paints a transparent tray behind physical piles",()=>{
  assert.match(polish,/battlefield-surface \.board-resource-row \{[\s\S]*padding:0 !important;[\s\S]*border:0 !important;[\s\S]*background:transparent !important;[\s\S]*box-shadow:none !important/);
});

test("desktop match shell uses overlay utilities instead of a permanent side rail",()=>{
  assert.match(app,/function renderDesktopMatchUtilities\(match, guidanceTip\)/);
  assert.match(app,/renderDesktopMatchUtilities\(match, guidanceTip\)/);
  assert.match(app,/data-action="resign"[\s\S]*Resign match/);
  assert.match(app,/renderActions\(match,\{includeResign:false\}\)/);
  assert.match(css,/@media \(min-width:761px\)[\s\S]*arena-layout \{[\s\S]*grid-template-columns:minmax\(0,1fr\) !important/);
  assert.match(css,/desktop-match-utility-panel \{[\s\S]*position:absolute/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*desktop-match-utilities \{ display:none !important; \}/);
});

test("German result screen copy is routed through the i18n layer",()=>{
  for (const key of ['matchComplete','victory','defeat','viewResults','reportIssue','turns','duration','finalRep','claimReward']) {
    assert.match(en,new RegExp(`${key}:`));
    assert.match(de,new RegExp(`${key}:`));
  }
  assert.match(app,/t\('result\.matchComplete'\)/);
  assert.match(app,/matchResultTitle\(outcome\)/);
  assert.match(app,/t\('result\.reportIssue'\)/);
  assert.match(app,/t\('result\.claimReward'\)/);
});

console.log(`\n${passed}/${passed} v7.69.26 tests passed.`);
