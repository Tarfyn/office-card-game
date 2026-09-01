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
const html=root("public/index.html");
const readme=root("README.md");
const settings=JSON.parse(root("data/match-settings.json"));
const polish=css.slice(css.lastIndexOf("/* v7.69.12 — centered hover preview, board-native placement + compact physical piles */"));
function between(source:string,start:string,end:string){ const a=source.indexOf(start),b=source.indexOf(end,a+start.length); assert.ok(a>=0&&b>a); return source.slice(a,b); }

test("v7.69.12 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.24");
  assert.match(server,/version: "7\.69\.24"/);
  assert.match(server,/version:"7\.69\.24"/);
  assert.match(server,/Office Card Game v7\.69\.24 server/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.12 — Preview \+ Board Interaction Polish/);
  assert.match(pkg.scripts.test,/dist\/test\/v76912\.test\.js/);
});

test("hover closeups use one battlefield-centered preview position",()=>{
  const hover=between(app,"function showHoverPreview", "function bindHoverPreviewHandlers");
  assert.match(hover,/document\.querySelector\('\.battlefield-surface'\)\?\.getBoundingClientRect\(\)/);
  assert.match(hover,/battlefield\.left \+ battlefield\.width \/ 2/);
  assert.match(hover,/battlefield\.top \+ battlefield\.height \/ 2/);
  assert.match(hover,/centerX - width \/ 2/);
  assert.match(hover,/centerY - height \/ 2/);
  assert.doesNotMatch(hover,/anchorEl\.closest/);
});

test("employee and support placement are board-native and cancellable without a modal",()=>{
  const interaction=between(app,"function renderInteraction", "function zoneCueEventsForPlayer");
  assert.match(interaction,/interaction\.type === 'EMPLOYEE'\) return ''/);
  assert.match(interaction,/interaction\.type === 'SUPPORT'\) return ''/);
  assert.match(interaction,/interaction\.type === 'PROMOTION'/);
  assert.match(interaction,/interaction\.type === 'TARGETS'/);
  const hand=between(app,"function beginHandCardPlay", "function capacityPips");
  assert.match(hand,/state\.interaction\.cardId === cardId\) return cancelInteraction\(\)/);
  assert.match(app,/\['ATTACK','EMPLOYEE','SUPPORT'\]\.includes\(state\.interaction\?\.type \?\? ''\)/);
  assert.match(app,/slot-candidate/);
});

test("1K hand is centered on playable lane geometry",()=>{
  assert.match(polish,/@media \(min-width:761px\) and \(max-width:2199px\) and \(min-height:601px\)[\s\S]*?own-hand \{ left:calc\(50% \+ 27px\); \}/);
});

test("desktop piles emphasize the actual card stack and zero states show no fake card",()=>{
  assert.match(polish,/board-resource-row \{[\s\S]*?width:82px/);
  assert.match(polish,/deck-stack-visual,[\s\S]*?archive-stack-visual \{[\s\S]*?width:52px;[\s\S]*?height:73px/);
  assert.match(polish,/deck-stack-empty,[\s\S]*?archive-stack-empty \{ display:none !important; \}/);
  assert.match(app,/archive-compact \$\{own \? 'archive-own' : 'archive-opponent'\} \$\{player\.archive\.length \? '' : 'is-empty'\}/);
  const deck=between(app,"function renderDeckStackVisual", "function renderPlayer(player, own, match)");
  assert.match(deck,/deckCount \?\? 0\) <= 0\) return '<span class="deck-stack-empty"/);
  assert.match(deck,/cardBackMarkup/);
});

test("board-wide direct attack remains the canonical large target",()=>{
  assert.match(app,/data-direct-attack-board="1"/);
  assert.match(app,/addEventListener\('click', \(event\) => \{ commitDirectAttackFromBoard\(event\); \}, true\)/);
  assert.match(app,/sendIntent\(\{ type:'DECLARE_ATTACK', attackerId, targetId:null \}\)/);
});

test("ranked timer remains disabled",()=>{
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
});

console.log(`\n${passed}/${passed} v7.69.12 tests passed.`);
