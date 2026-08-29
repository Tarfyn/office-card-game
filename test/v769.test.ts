import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const server=root("server/server.mjs");
const html=root("public/index.html");
const app=root("public/app.js");
const css=root("public/styles.css");
const readme=root("README.md");

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  assert.ok(b>a,`missing ${end}`);
  return source.slice(a,b);
}

test("v7.69 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.1");
  assert.match(server,/version: "7\.69\.1"/);
  assert.match(server,/Office Card Game v7\.69\.1 server/);
  assert.match(html,/v7\.69\.1 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.1 — Responsive Battlefield \+ Critical Mobile Controls/);
});

test("v7.69 separates arena artwork from code-native battlefield geometry",()=>{
  assert.match(app,/const MATCH_ARENA_KEY = 'office-card-game-match-arena-v1'/);
  assert.match(app,/const MATCH_ARENAS = Object\.freeze\(/);
  assert.match(app,/id:'default', image:null/);
  const arena=sliceBetween(app,"function matchArenaPreference", "function matchArenaStyle");
  assert.ok(arena.includes("/^\\/art\\/boards\\/"));
  assert.match(arena,/webp\|png\|jpe\?g/);
  assert.match(app,/class="arena-background-layer"/);
  assert.match(app,/class="arena-surface-layer"/);
  assert.match(css,/--match-arena-image/);
});

test("v7.69 keeps player identity faction-neutral and deck-aware",()=>{
  const player=sliceBetween(app,"function renderPlayer(player, own, match)", "function actionButton");
  assert.match(player,/roomDeckMeta\(player\.id\)/);
  assert.match(player,/playerName/);
  assert.match(player,/deckName/);
  assert.match(player,/player-role-mark/);
  assert.doesNotMatch(player,/identity\.label/);
  assert.doesNotMatch(player,/HOSTILE|RIVAL CORP|YOUR DEPARTMENT/i);
  assert.match(app,/match-result-emblem[^\n]*<small>YOU<\/small>/);
});

test("v7.69 hard-codes five Employee slots and four Support-System slots on desktop and mobile",()=>{
  assert.match(css,/body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(70px,116px\)\); \}/);
  assert.match(css,/body\.match-mode \.slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,minmax\(70px,116px\)\);/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(0,1fr\)\) !important; \}/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.slots\.support-row,[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/content:'EMPLOYEES · 5'/);
  assert.match(css,/content:'SUPPORT \/ SYSTEM · 4'/);
});

test("v7.69 locks active matches to a board-first viewport without changing ended result scrolling",()=>{
  const render=sliceBetween(app,"function render()", "async function createRoom");
  assert.match(render,/classList\.toggle\('match-viewport-locked', liveMatch && !endedMatch\)/);
  assert.match(css,/body\.match-viewport-locked \{ overflow:hidden;/);
  assert.match(css,/body\.match-mode \.game-main/);
  assert.match(css,/calc\(100dvh - 46px\)/);
  assert.match(app,/class="arena-layout"/);
  assert.match(app,/class="arena-board-column"/);
  assert.match(app,/class="arena-sidepanel"/);
  assert.match(app,/id="matchResultDetail"/);
});

test("v7.69 prevents field-card hover and inspector overlays from moving the battlefield",()=>{
  assert.match(css,/body\.match-mode \.board-lane \.card:not\(\.hidden-card\):hover,[\s\S]*?transform:none !important/);
  assert.match(css,/\.hover-card-preview[\s\S]*?position:fixed/);
  assert.match(css,/overflow-anchor:none/);
  assert.match(app,/previousBattlefieldTop != null && !document\.body\.classList\.contains\('match-viewport-locked'\)/);
});

test("v7.69 gives battlefield slots recessed depth without geometry-changing 3D transforms",()=>{
  const empty=sliceBetween(css,"body.match-mode .field-empty:not(.slot-candidate) {","body.match-mode .field-empty:not(.slot-candidate)::before");
  assert.match(empty,/inset 0 4px 6px -1px rgba\(0,0,0,\.50\)/);
  assert.match(empty,/inset 0 2px 4px -1px rgba\(0,0,0,\.30\)/);
  const candidate=sliceBetween(css,"body.match-mode .field-empty.slot-candidate {","body.match-mode .board-lane .card {");
  assert.match(candidate,/inset 0 0 10px rgba\(74,225,118,\.16\)/);
  assert.doesNotMatch(css,/board-tilt[\s\S]*rotateX\(/);
  assert.doesNotMatch(css,/body\.match-mode \.board-lane \.card[^}]*translateY\(-5px\)/);
});

test("v7.69 queues longer gameplay feedback while preserving independent attack pacing",()=>{
  assert.match(app,/const ATTACK_PRESENTATION_MS = 2400/);
  assert.match(app,/const GAMEPLAY_PRESENTATION_MS = 2800/);
  assert.match(app,/gameplayPresentationQueue/);
  assert.match(app,/enqueueGameplayPresentations\(freshCues\)/);
  assert.match(app,/OPPONENT PLAYED/);
  assert.match(app,/class="gameplay-presentation/);
  assert.match(css,/\.gameplay-presentation \{[\s\S]*?position:fixed/);
});

test("v7.69 exposes a persistent match-complete overlay with clear reasons and View Results",()=>{
  const overlay=sliceBetween(app,"function matchEndOverlayReason", "function openingCardCost");
  assert.match(overlay,/Opponent Company Reputation reached 0\./);
  assert.match(overlay,/Your Company Reputation reached 0\./);
  assert.match(overlay,/Opponent resigned\./);
  assert.match(overlay,/MATCH COMPLETE/);
  assert.match(overlay,/VICTORY/);
  assert.match(overlay,/DEFEAT/);
  assert.match(overlay,/View results/);
  assert.match(overlay,/matchEndOverlayDismissedRoomId/);
  assert.match(css,/\.match-end-overlay \{[\s\S]*?position:fixed/);
});

test("v7.69 retains real game terminology in the new match-shell code",()=>{
  const shell=app.slice(app.indexOf("function roomDeckMeta"), app.indexOf("function telemetryMetricLabel"));
  assert.match(app,/COMPANY REPUTATION/);
  assert.match(app,/CAPACITY/);
  assert.match(app,/>DECK</);
  assert.match(app,/>ARCHIVE</);
  assert.doesNotMatch(shell,/Hostile Takeover|Synergy Capital|Internal Assets|Audit Log|Rival Corp/i);
});



test("v7.69.1 reserves a real center seam and constrains rows instead of overlapping them",()=>{
  assert.match(css,/grid-template-rows:minmax\(0,1fr\) 26px minmax\(0,1fr\)/);
  assert.match(css,/body\.match-mode \.opponent-board \{ grid-row:1; \}/);
  assert.match(css,/body\.match-mode \.own-board \{ grid-row:3; \}/);
  assert.match(css,/body\.match-mode \.office-divider \{[\s\S]*?position:relative;[\s\S]*?grid-row:2;/);
  assert.match(css,/height:min\(100%,162px\)/);
});

test("v7.69.1 scales the board HUD up for large and 4K displays",()=>{
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,164px\)\)/);
  assert.match(css,/max-width:164px; max-height:230px/);
  assert.match(css,/@media \(min-width:3200px\) and \(min-height:1500px\)/);
});

test("v7.69.1 keeps mobile opening chrome compact and removes it after setup",()=>{
  const opening=sliceBetween(app,"function renderMatchOpening(match)","function renderTurnFlowCue");
  assert.match(opening,/if \(match\.status !== 'SETUP'\) return ''/);
  assert.doesNotMatch(opening,/firstStart/);
  assert.match(css,/body\.match-mode \.match-opening \{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/body\.match-mode \.mulligan-actions \{ grid-template-columns:1fr 1fr/);
});

test("v7.69.1 exposes mobile Take control and Resign without the desktop side panel",()=>{
  assert.match(app,/function renderMobileMatchMenu\(match\)/);
  assert.match(app,/data-take-session-control>Take control here/);
  assert.match(app,/data-action="resign"/);
  assert.match(app,/renderMobileMatchMenu\(match\)/);
  assert.match(css,/\.mobile-match-menu \{ display:none; \}/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.mobile-match-menu \{[\s\S]*?display:block/);
});

test("v7.69.1 keeps read-only feedback singular and actionable",()=>{
  const send=sliceBetween(app,"async function sendIntent(intent)","async function boot()");
  assert.match(send,/const readOnlyMessage = 'This tab is read-only/);
  assert.match(send,/state\.lastError = null/);
  assert.match(app,/data-take-session-control/);
  assert.match(css,/body\.match-mode \.connection-banner \{[\s\S]*?position:fixed/);
});

console.log(`\n${passed}/${passed} v7.69 tests passed.`);
