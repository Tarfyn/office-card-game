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
const polish=css.slice(css.lastIndexOf("/* v7.69.10 — phase baseline + board-wide direct attack target */"));

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start); const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`); assert.ok(b>a,`missing ${end}`); return source.slice(a,b);
}

test("v7.69.10 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.12");
  assert.match(server,/version: "7\.69\.12"/);
  assert.match(server,/version:"7\.69\.12"/);
  assert.match(server,/Office Card Game v7\.69\.12 server/);
  assert.match(html,/v7\.69\.12 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.10 — Direct Attack Target \+ Phase Alignment/);
  assert.match(pkg.scripts.test,/dist\/test\/v76910\.test\.js/);
});

test("phase labels are optically centered without changing segment geometry",()=>{
  assert.match(polish,/board-phase-divider \.phase-track span b[\s\S]*?display:block[\s\S]*?transform:translateY\(-0\.5px\)/);
  assert.match(css,/board-phase-divider \.phase-track[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("server-legal direct attack exposes the opponent halfboard as a large target",()=>{
  const player=sliceBetween(app,"function renderPlayer(player, own, match)","function actionButton");
  assert.match(player,/const directBoardTarget = !own && state\.interaction\?\.type === 'ATTACK' && state\.interaction\.targetIds\.includes\(null\)/);
  assert.match(player,/data-direct-attack-board/);
  const direct=sliceBetween(app,"function commitDirectAttackFromBoard", "function bindInteractionHandlers");
  const handlers=sliceBetween(app,"function bindInteractionHandlers", "function bindCardInfoHandlers");
  assert.match(handlers,/\[data-direct-attack-board\]/);
  assert.match(handlers,/state\.hoverAttackTargetId = '__DIRECT_REP__'/);
  assert.match(direct,/sendIntent\(\{ type:'DECLARE_ATTACK', attackerId, targetId:null \}\)/);
  assert.ok(direct.includes("event?.target?.closest?.('.card,button,a,input,select,textarea,summary,details,.player-head,.board-resource-row,.pending-lane,.opponent-hand')"));
});

test("direct board targeting keeps the existing REP destination and clear touch state",()=>{
  assert.match(app,/data-direct-attack-target="1"/);
  assert.match(polish,/opponent-board\.direct-attack-board-target[\s\S]*?rgba\(220,72,72/);
  assert.match(polish,/@media \(hover:none\), \(pointer:coarse\)[\s\S]*?opponent-board\.direct-attack-board-target/);
});

test("public match identity keeps curated title instead of a free deck name and ranked timer stays off",()=>{
  const player=sliceBetween(app,"function renderPlayerAvatar", "function actionButton");
  assert.match(player,/roomPlayerTitle\(player\.id\)/);
  assert.doesNotMatch(player,/roomDeckNameForPlayer\(player\.id\)/);
  assert.equal(settings.ranked?.timerEnabled ?? settings.rankedTimerEnabled ?? false,false);
  assert.match(server,/timerActive:false/);
});

console.log(`\n${passed}/${passed} v7.69.10 tests passed.`);
