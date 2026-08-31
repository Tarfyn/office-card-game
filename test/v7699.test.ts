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
const settings=JSON.parse(root("data/match-settings.json"));
const polish=css.slice(css.lastIndexOf("/* v7.69.9 — responsive board recovery, HUD identity + one-shot combat polish */"));

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start); const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`); assert.ok(b>a,`missing ${end}`); return source.slice(a,b);
}

test("v7.69.9 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.19");
  assert.match(server,/version: "7\.69\.19"/);
  assert.match(server,/version:"7\.69\.19"/);
  assert.match(server,/Office Card Game v7\.69\.19 server/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.9 — Responsive Board \+ Interaction Follow-up/);
  assert.match(pkg.scripts.test,/dist\/test\/v7699\.test\.js/);
});

test("phase divider is five contained segments below decision and inspector layers",()=>{
  assert.match(polish,/office-divider\.board-phase-divider[\s\S]*?z-index:20/);
  assert.match(polish,/\.board-phase-divider \.phase-track \{[\s\S]*?padding:0;[\s\S]*?gap:0/);
  assert.match(polish,/\.board-phase-divider \.phase-track span[\s\S]*?height:100%/);
  assert.match(polish,/span\.active[\s\S]*?rgba\(74,225,118/);
  assert.match(polish,/span\.active::after \{ display:none/);
  assert.match(css,/body\.match-mode \.decision-center[\s\S]*?z-index:30/);
  assert.match(css,/\.modal-backdrop[\s\S]*?z-index:\s*100/);
});

test("mobile P0 guard keeps the full board and both 5+4 rows inside the viewport",()=>{
  const mobile=polish.slice(polish.indexOf('@media (max-width:760px)'));
  assert.match(mobile,/\.arena-layout[\s\S]*?grid-template-columns:minmax\(0,1fr\) !important/);
  assert.match(mobile,/\.battlefield-surface[\s\S]*?width:100%[\s\S]*?overflow:hidden/);
  assert.match(mobile,/\.opponent-board[\s\S]*?padding:var\(--player-outer-reserve\) 40px 0 3px !important/);
  assert.match(mobile,/\.own-board[\s\S]*?padding:0 40px var\(--player-outer-reserve\) 3px !important/);
  assert.match(mobile,/\.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(0,1fr\)\) !important/);
  assert.match(mobile,/\.slots\.support-row,[\s\S]*?repeat\(4,minmax\(0,1fr\)\) !important/);
  assert.match(mobile,/\.match-opening[\s\S]*?height:auto !important[\s\S]*?max-height:68px/);
});

test("recovery banner is in-flow and cannot cover the player identity bar",()=>{
  assert.match(polish,/body\.match-mode \.connection-banner \{[\s\S]*?position:relative[\s\S]*?top:auto[\s\S]*?left:auto/);
  const mobile=polish.slice(polish.indexOf('@media (max-width:760px)'));
  assert.match(mobile,/\.connection-banner \{[\s\S]*?position:relative !important/);
});

test("match identity reserves title/badge space without department or public deck-name labels",()=>{
  const player=sliceBetween(app,"function renderPlayerAvatar", "function actionButton");
  assert.doesNotMatch(player,/departmentMark\(department\)/);
  assert.match(player,/player-title-slot/);
  assert.match(player,/roomPlayerTitle\(player\.id\)/);
  assert.doesNotMatch(player,/roomDeckNameForPlayer\(player\.id\)/);
  assert.doesNotMatch(player,/TITLE SLOT/);
  const opening=sliceBetween(app,"function renderMatchOpening", "function renderTurnFlowCue");
  assert.doesNotMatch(opening,/mine\.name/);
  assert.doesNotMatch(opening,/theirs\.name/);
  assert.match(polish,/player-head[\s\S]*?width:clamp\(390px,34vw,590px\)/);
});

test("halfboards have no artificial vertical center split and meet the seam",()=>{
  assert.match(polish,/arena-surface-layer::before[\s\S]*?repeating-linear-gradient/);
  const surface=polish.match(/arena-surface-layer::before \{([\s\S]*?)\}/)?.[1] ?? '';
  assert.doesNotMatch(surface,/49\.88%|50\.12%/);
  assert.match(polish,/opponent-board \{ padding-bottom:0; \}/);
  assert.match(polish,/own-board \{ padding-top:0; \}/);
});

test("attack mode is board-native, toggleable, escape-cancellable and supports direct REP target hover",()=>{
  const interaction=sliceBetween(app,"function beginAttack", "function advanceTargetChoice");
  assert.match(interaction,/interaction\?\.type === 'ATTACK'[\s\S]*?cancelInteraction\(\)/);
  const renderInteraction=sliceBetween(app,"function renderInteraction", "function zoneCueEventsForPlayer");
  assert.match(renderInteraction,/interaction\.type === 'ATTACK'\) return ''/);
  assert.doesNotMatch(renderInteraction,/Attack Company Reputation/);
  const handlers=sliceBetween(app,"function bindInteractionHandlers", "function bindCardInfoHandlers");
  assert.match(handlers,/\[data-direct-attack-target\]/);
  assert.match(handlers,/__DIRECT_REP__/);
  assert.match(app,/event\.key === 'Escape'[\s\S]*?\['ATTACK','EMPLOYEE','SUPPORT'\]\.includes[\s\S]*?cancelInteraction\(\)/);
});

test("combat overlay is keyed and mounted once outside normal match rerenders",()=>{
  const combat=sliceBetween(app,"function combatPresentationKey", "function resolutionOutcomeEvent");
  assert.match(combat,/battle:\$\{battle\.seq\}/);
  assert.match(combat,/direct:\$\{directAttack\.seq\}:\$\{directRep\.seq\}/);
  assert.match(combat,/host\.dataset\.presentationKey === key\) return/);
  assert.match(combat,/document\.body\.appendChild\(host\)/);
  const game=sliceBetween(app,"function renderGame()", "function render()");
  assert.match(game,/syncCombatPresentationHost\(\)/);
  assert.doesNotMatch(game,/\$\{renderCombatMoment\(\)\}/);
});

test("card readability keeps Employee blue and moves inspector affordance below real card content",()=>{
  assert.match(polish,/card\.type-employee[\s\S]*?--type-color:#287fb1/);
  assert.match(polish,/card\.legal-card[\s\S]*?border-color:var\(--type-color\) !important/);
  assert.match(polish,/hover-card-face \.hover-inspect-hint[\s\S]*?position:absolute[\s\S]*?bottom:8px/);
  assert.match(polish,/hover-card-face \{ padding-bottom:58px; \}/);
  assert.match(app,/Right-click to pin inspector/);
});

test("deck/archive and opponent played-card feedback are readable without changing hidden information",()=>{
  assert.match(app,/deck-stack-visual/);
  assert.match(app,/renderArchiveStackVisual/);
  assert.match(polish,/archive-compact\[open\] \.archive-grid[\s\S]*?minmax\(96px,1fr\)/);
  assert.match(app,/event\.type === 'CARD_PLAYED' && !opponent\) return null/);
  assert.match(polish,/gameplay-presentation\.card-played[\s\S]*?width:86px; height:120px/);
  assert.match(app,/concealedFaceDownSupport/);
  assert.match(app,/cardBackMarkup\(\)/);
});

test("Defeat is explicitly red and ranked timer remains disabled",()=>{
  const overlay=sliceBetween(app,"function renderMatchEndOverlay", "function bindMatchEndOverlay");
  assert.match(overlay,/const tone = outcome === 'WIN' \? 'win' : outcome === 'DRAW' \? 'draw' : 'loss'/);
  assert.match(polish,/match-end-overlay\.tone-loss[\s\S]*?background:#9b3437/);
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
});

console.log(`\n${passed}/${passed} v7.69.9 tests passed.`);
