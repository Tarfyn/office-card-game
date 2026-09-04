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
const polish=css.slice(css.lastIndexOf("/* v7.69.11 — stable transient motion, hover-safe cards + readable deck/archive piles */"));
function between(source:string,start:string,end:string){ const a=source.indexOf(start),b=source.indexOf(end,a+start.length); assert.ok(a>=0&&b>a); return source.slice(a,b); }

test("v7.69.11 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.49");
  assert.match(server,/version: "7\.69\.49"/);
  assert.match(server,/version:"7\.69\.49"/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.11 — Render Stability \+ Pile Polish/);
  assert.match(pkg.scripts.test,/dist\/test\/v76911\.test\.js/);
});

test("hand hover preview keeps measured-height viewport clamping",()=>{
  const hover=between(app,"function showHoverPreview", "function bindHoverPreviewHandlers");
  assert.match(hover,/preview\.getBoundingClientRect\(\)/);
  assert.match(hover,/window\.innerHeight - height - 12/);
});

test("attack-ready hover does not leak attack selection dimming",()=>{
  const focus=between(app,"function boardActionFocusMeta", "function battlePhaseContext");
  assert.match(focus,/const includeAttackHoverFocus = false/);
  assert.match(focus,/if \(attack && includeAttackHoverFocus\)/);
  assert.match(app,/state\.interaction = \{ type:'ATTACK', attackerId, targetIds:attack\.targetIds \}/);
});

test("transient card and zone movement motion is consumed once per authoritative event",()=>{
  assert.match(app,/renderedMotionCueKeys: new Set\(\)/);
  assert.match(app,/function transientEventMotionKey/);
  assert.match(app,/function zoneCueMotionKey/);
  assert.match(app,/function markRenderedTransientMotion/);
  assert.match(app,/if \(!transientMotionIsFresh\(transientEventMotionKey\(cue\)\)\) continue/);
  assert.match(app,/transientMotionIsFresh\(zoneCueMotionKey\(\)\)/);
  assert.match(app,/markRenderedTransientMotion\(\);\s*syncCombatPresentationHost\(\)/);
  assert.match(polish,/zone-transition-cue\.motion-stable \{ animation:none !important; \}/);
});

test("direct attack board hitbox commits in capture phase while preserving interactive exclusions",()=>{
  const handlers=between(app,"function commitDirectAttackFromBoard", "function bindCardInfoHandlers");
  assert.match(handlers,/interaction\.targetIds\.includes\(null\)/);
  assert.ok(handlers.includes("event?.target?.closest?.('.card,button,a,input,select,textarea,summary,details,.player-head,.board-resource-row,.pending-lane,.opponent-hand')"));
  assert.match(handlers,/sendIntent\(\{ type:'DECLARE_ATTACK', attackerId, targetId:null \}\)/);
  assert.match(handlers,/addEventListener\('click', \(event\) => \{ commitDirectAttackFromBoard\(event\); \}, true\)/);
});

test("deck and archive piles gain desktop presence and empty deck has no card back",()=>{
  assert.match(app,/function renderDeckStackVisual\(deckCount\)/);
  assert.match(app,/deckCount \?\? 0\) <= 0\) return '<span class="deck-stack-empty"/);
  assert.match(app,/player\.deckCount > 0 \? '' : 'is-empty'/);
  assert.match(polish,/board-resource-row \{ width:118px/);
  assert.match(polish,/deck-stack-empty[\s\S]*?border:1px dashed/);
  const helper=between(app,"function renderDeckStackVisual", "function renderPlayer(player, own, match)");
  assert.match(helper,/cardBackMarkup/);
});

test("ranked timer remains disabled",()=>{
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
});

console.log(`\n${passed}/${passed} v7.69.11 tests passed.`);
