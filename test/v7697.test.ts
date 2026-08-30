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
const cards:any[]=JSON.parse(root("data/cards.json"));
const settings=JSON.parse(root("data/match-settings.json"));
const fileExists=(url:URL)=>{ try { readFileSync(fileURLToPath(url)); return true; } catch { return false; } };

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  assert.ok(b>a,`missing ${end}`);
  return source.slice(a,b);
}

const polishStart=css.lastIndexOf("/* v7.69.7 — card consistency, mirrored field geometry + restrained material completion */");
const polishEnd=css.indexOf("/* v7.69.8 — board geometry, inspect affordance + readable combat resolution */",polishStart);
const polish=css.slice(polishStart,polishEnd>polishStart?polishEnd:undefined);

test("v7.69.7 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.9");
  assert.match(server,/version: "7\.69\.9"/);
  assert.match(server,/version:"7\.69\.9"/);
  assert.match(server,/Office Card Game v7\.69\.9 server/);
  assert.match(html,/v7\.69\.9 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.7 — Card Consistency \+ Artwork Completion/);
});

test("v7.69.7 completes the 107-card local artwork set without orphaning the GPT source slug",()=>{
  assert.equal(cards.length,107);
  assert.equal(cards.filter((card)=>Boolean(card.artId)).length,107);
  for (const card of cards) {
    assert.match(card.artId,/^alpha\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/);
    const asset=fileURLToPath(new URL(`../../public/art/${card.artId}`,import.meta.url));
    assert.ok(readFileSync(asset).length>1000,`missing artwork for ${card.id}: ${card.artId}`);
  }
  assert.equal(cards.find((card)=>card.id==="OFC-001")?.artId,"alpha/administrative-assistant.webp");
  assert.equal(fileExists(new URL("../../public/art/alpha/gpt-administrative-assistant.webp",import.meta.url)),false);
});

test("v7.69.7 restores live-card rules and bottom tags while keeping the existing Power badge language",()=>{
  assert.match(polish,/body\.match-mode \.board-lane \.card \.card-rules-mini,[\s\S]*?body\.match-mode \.own-hand \.hand-fan-card \.card-tags \{[\s\S]*?display:flex/);
  assert.match(polish,/body\.match-mode \.board-lane \.card \.card-tags span,[\s\S]*?font-size:3\.4px/);
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*?\.card-type-strip \{[\s\S]*?display:flex/);
  const power=sliceBetween(app,"function renderPowerDisplay", "function powerRuntimeText");
  assert.match(power,/changed \? `<div class="current-power-badge \$\{direction\}"/);
  assert.match(power,/power-badge/);
  assert.match(polish,/\.card\.type-employee \.power-cluster \.power-badge,[\s\S]*?background:#287ba5/);
});

test("v7.69.7 renders set Support cards as one full portrait back while retaining interaction overlays",()=>{
  const renderCard=sliceBetween(app,"function renderCard(card", "function renderModalCardFace");
  assert.match(renderCard,/if \(concealedFaceDownSupport\) return `<div class="\$\{cardClassName\}"[\s\S]*?\$\{cardBackMarkup\(\)\}/);
  assert.match(renderCard,/face-down-card-state/);
  assert.match(renderCard,/data-card-ability/);
  assert.match(polish,/\.card\.face-down-support \{[\s\S]*?padding:0 !important/);
  assert.match(polish,/\.card\.face-down-support > \.ocg-card-back \{ inset:0/);
  const opponent=sliceBetween(app,"function renderOpponentHand", "function legalEmployeeOptionsForSlot");
  assert.match(opponent,/cardBackMarkup\(\{ compact:true \}\)/);
});

test("v7.69.7 balances Own and Opponent around the same canonical 5+4 lane geometry",()=>{
  assert.match(css,/body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(70px,116px\)\); \}/);
  assert.match(css,/body\.match-mode \.slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,minmax\(70px,116px\)\);/);
  assert.match(polish,/--field-board-half-balance:57px/);
  assert.match(polish,/body\.match-mode \.opponent-board \{ padding-top:40px; \}/);
  assert.match(polish,/body\.match-mode \.own-board \{ padding-bottom:154px; \}/);
  assert.match(polish,/@media \(min-width:761px\) and \(max-height:1000px\)[\s\S]*?--field-board-half-balance:60px/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?--field-board-half-balance:88px/);
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*?--field-board-half-balance:68\.5px/);
});

test("v7.69.7 grows only the 4K starter dossiers downward without changing starter-deck logic",()=>{
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?\.desk-starter-tray \.starter-identity \{[\s\S]*?min-height:clamp\(250px,14vh,310px\)/);
  assert.doesNotMatch(polish,/@media \(max-width:760px\)[\s\S]*?\.desk-starter-tray \.starter-identity[^}]*min-height:clamp\(250px/);
  assert.match(app,/data-starter-deck/);
  assert.match(app,/weightedLobbyShowcaseSample/);
});

test("v7.69.7 gives the Deckbuilder a restrained material layer without new layout structure",()=>{
  const render=sliceBetween(app,"function render()", "async function createRoom");
  assert.match(render,/classList\.toggle\('collection-mode', collectionMode\)/);
  const deckMaterial=polish.slice(polish.indexOf("/* Deckbuilder: same desk family"));
  assert.match(deckMaterial,/paper-offwhite\/basecolor\.webp/);
  assert.match(deckMaterial,/folder-manila\/basecolor\.webp/);
  assert.match(deckMaterial,/plastic-dark-matte\/basecolor\.webp/);
  assert.match(deckMaterial,/metal-black-coated\/basecolor\.webp/);
  assert.match(deckMaterial,/\.collection-preview\.empty \{[\s\S]*?border-style:solid/);
  assert.doesNotMatch(deckMaterial,/grid-template-columns|grid-template-rows/);
});

test("v7.69.7 keeps Ranked timer disabled and preserves Office Coach plus direct REP connector fixes",()=>{
  const ranked=settings.timerProfiles.find((profile:any)=>profile.id==="RANKED_STANDARD_TBD");
  assert.ok(ranked);
  assert.equal(ranked.enabled,false);
  assert.match(css,/\.arena-sidepanel \.guidance-coach \{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  const connector=sliceBetween(app,"function drawAttackConnector", "function departmentMark");
  assert.match(connector,/directAttackDefenderId\(match\)/);
  assert.match(connector,/\.reputation-target-anchor\[data-reputation-player/);
});

console.log(`\n${passed}/${passed} v7.69.7 tests passed.`);
