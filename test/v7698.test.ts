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

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  assert.ok(b>a,`missing ${end}`);
  return source.slice(a,b);
}
const polish=css.slice(css.lastIndexOf("/* v7.69.8 — board geometry, inspect affordance + readable combat resolution */"));

test("v7.69.8 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.54");
  assert.match(server,/version: "7.69.54"/);
  assert.match(server,/version:"7\.69\.54"/);
  assert.match(server,/Office Card Game v7\.69\.54 server/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.8 — Board Geometry \+ Combat Readability/);
  assert.match(pkg.scripts.test,/dist\/test\/v7698\.test\.js/);
});

test("v7.69.8 makes the center seam the compact five-phase track and removes the duplicate top track",()=>{
  const phase=sliceBetween(app,"function renderPhaseTrack", "function actionAvailability");
  assert.match(phase,/MATCH_PHASE_FLOW\.map/);
  assert.match(phase,/aria-current="step"/);
  assert.match(phase,/function renderBoardPhaseDivider/);
  assert.match(phase,/office-divider board-phase-divider/);
  const game=sliceBetween(app,"function renderGame()", "function render()");
  assert.match(game,/\$\{renderPlayer\(them,false,match\)\}[\s\S]*?\$\{renderBoardPhaseDivider\(match\)\}[\s\S]*?\$\{renderPlayer\(me,true,match\)\}/);
  const top=game.slice(game.indexOf('<div class="arena-top-stack">'),game.indexOf('${renderMobileBoardNav(match)}'));
  assert.doesNotMatch(top,/renderPhaseTrack/);
  assert.match(polish,/grid-template-rows:minmax\(0,1fr\) var\(--field-seam\) minmax\(0,1fr\)/);
  assert.match(polish,/\.board-phase-divider \.phase-track[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(polish,/\.phase-track span\.active[\s\S]*?#4ae176/);
});

test("v7.69.8 defines truly equal mirrored halfboards around one neutral seam",()=>{
  assert.match(polish,/body\.match-mode \.opponent-board \{[\s\S]*?grid-row:1;[\s\S]*?padding:var\(--player-outer-reserve\) 104px 6px 158px;/);
  assert.match(polish,/body\.match-mode \.own-board \{[\s\S]*?grid-row:3;[\s\S]*?padding:6px 104px var\(--player-outer-reserve\) 158px;/);
  assert.match(css,/body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(70px,116px\)\); \}/);
  assert.match(css,/body\.match-mode \.slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,minmax\(70px,116px\)\);/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?--field-seam:38px;[\s\S]*?--player-outer-reserve:190px/);
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*?grid-template-rows:minmax\(0,1fr\) var\(--field-seam\) minmax\(0,1fr\)/);
});

test("v7.69.8 keeps the battlefield visually clean and reserves identity space for future cosmetics",()=>{
  assert.match(polish,/\.arena-surface-layer::after \{ display:none; content:none; \}/);
  assert.match(polish,/\.employee-row::after,[\s\S]*?\.support-row::after \{ display:none; content:none; \}/);
  const player=sliceBetween(app,"function playerInitials", "function actionButton");
  assert.match(player,/function renderPlayerAvatar/);
  assert.match(player,/player-avatar-slot/);
  assert.match(player,/renderAvatarComposition\(/);
  assert.match(player,/renderPlayerAvatar\(player\.id, own\)/);
  assert.match(polish,/Player identity is now a dedicated cosmetic-ready zone/);
});

test("v7.69.8 reveals a set Incident to its controller but keeps it concealed from the opponent",()=>{
  const card=sliceBetween(app,"function renderCard(card", "function renderModalCardFace");
  assert.match(card,/const faceDownSupport = card\.zone === 'SUPPORT_FIELD' && !card\.faceUp/);
  assert.match(card,/const concealedFaceDownSupport = faceDownSupport && card\.controllerId !== match\?\.viewerId/);
  assert.match(card,/if \(concealedFaceDownSupport\) return[\s\S]*?cardBackMarkup\(\)/);
  assert.match(card,/concealedFaceDownSupport \? 'face-down-support' : faceDownSupport \? 'owner-visible-set' : ''/);
  assert.match(polish,/\.card\.owner-visible-set/);
  const opponent=sliceBetween(app,"function renderOpponentHand", "function legalEmployeeOptionsForSlot");
  assert.match(opponent,/cardBackMarkup\(\{ compact:true \}\)/);
});

test("v7.69.8 makes hover the fast read path and right-click the pinned inspector without changing left-click play",()=>{
  const hover=sliceBetween(app,"function bindHoverPreviewHandlers", "function clearBoardActionFocus");
  assert.match(hover,/querySelectorAll\('\.player-board \.card\[data-card-ref\]'\)/);
  assert.match(hover,/mouseenter/);
  const inspector=sliceBetween(app,"function bindCardInfoHandlers", "function bindMobileBoardNavHandlers");
  assert.match(inspector,/oncontextmenu/);
  assert.match(inspector,/event\.preventDefault\(\)/);
  assert.match(inspector,/openCardInspector\(el\.dataset\.cardInfo\)/);
  assert.match(inspector,/data-card-info-button/); // fallback remains available
  const interactions=sliceBetween(app,"function bindInteractionHandlers", "function bindCardInfoHandlers");
  assert.match(interactions,/\[data-play-hand\]/);
  assert.match(interactions,/beginHandCardPlay\(el\.dataset\.playHand\)/);
  assert.match(app,/Right-click to pin inspector/);
});

test("v7.69.8 previews a red card-to-card attack connector before commitment",()=>{
  const overlay=sliceBetween(app,"function renderAttackOverlay", "function departmentMark");
  assert.match(overlay,/state\.interaction\?\.type === 'ATTACK'/);
  assert.match(overlay,/state\.hoverAttackTargetId/);
  assert.match(overlay,/attack-preview-overlay/);
  const handlers=sliceBetween(app,"function bindInteractionHandlers", "function bindCardInfoHandlers");
  assert.match(handlers,/\[data-target-card\]/);
  assert.match(handlers,/mouseenter[\s\S]*?state\.hoverAttackTargetId = el\.dataset\.targetCard/);
  assert.match(handlers,/mouseleave[\s\S]*?state\.hoverAttackTargetId = null/);
  assert.match(polish,/\.attack-overlay\.attack-preview-overlay path#attackPath[\s\S]*?stroke:#ef5c52/);
});

test("v7.69.8 renders authoritative card combat with winner glow and ARCHIVED outcome",()=>{
  const combat=sliceBetween(app,"function renderCombatMoment", "function resolutionOutcomeEvent");
  assert.match(combat,/event\.type === 'BATTLE_RESOLVED'/);
  assert.match(combat,/destroyedIds/);
  assert.match(combat,/replacedOrPreventedIds/);
  assert.match(combat,/winnerId/);
  assert.match(combat,/battle-resolution-overlay card-battle/);
  assert.match(combat,/>VS</);
  assert.match(combat,/archive-stamp">ARCHIVED/);
  assert.match(combat,/battle-card-side winner/);
  assert.match(polish,/@keyframes battle-card-clash/);
  assert.match(polish,/@keyframes battle-winner-glow/);
  assert.match(polish,/@keyframes archive-stamp-in/);
});

test("v7.69.8 gives direct Company REP attacks the same VS language using the player portrait",()=>{
  const combat=sliceBetween(app,"function renderCombatMoment", "function resolutionOutcomeEvent");
  assert.match(combat,/ATTACK_DECLARED'[\s\S]*?targetId == null/);
  assert.match(combat,/REPUTATION_CHANGED'[\s\S]*?reason === 'DIRECT_ATTACK'/);
  assert.match(combat,/battle-resolution-overlay direct-battle/);
  assert.match(combat,/renderPlayerAvatar\(defenderId,!ownAttacker,\{ combat:true, repDelta:delta \}\)/);
  assert.match(combat,/COMPANY REP/);
  assert.match(polish,/\.battle-player-side\.hit \.player-avatar-slot/);
  assert.match(polish,/@keyframes player-rep-hit/);
  // Existing Direct Attack connector must still anchor on the visible REP target.
  assert.match(app,/reputation-target-anchor/);
  assert.match(app,/directAttackDefenderId\(match\)/);
});

test("v7.69.8 lengthens meaningful presentation windows and preserves critical regressions",()=>{
  assert.match(app,/const GAMEPLAY_PRESENTATION_MS = 3400/);
  assert.match(app,/\? 3800 : GAMEPLAY_PRESENTATION_MS/);
  assert.match(app,/state\.visualCueTimer = setTimeout\([\s\S]*?, 3600\)/);
  assert.match(polish,/\.visual-cue \{ animation:v7698-readable-cue 3\.5s ease both; \}/);
  assert.match(polish,/\.resolution-moment \{ animation:v7698-readable-resolution 5s ease both; \}/);
  assert.match(polish,/\.zone-transition-cue \{ animation-duration:2\.5s; \}/);
  assert.match(polish,/@keyframes v7698-readable-cue[\s\S]*?7%,88% \{ opacity:1/);
  assert.match(polish,/@keyframes v7698-readable-resolution[\s\S]*?7%,90% \{ opacity:1/);
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
  assert.match(css,/\.arena-sidepanel \.guidance-coach/);
  assert.match(app,/reputation-target-anchor/);
});

console.log(`\n${passed}/${passed} v7.69.8 tests passed.`);
