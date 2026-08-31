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
const polish=css.slice(css.lastIndexOf("/* v7.69.16 — small visual regression fixes: catalog art, mobile field cards, hand isolation + 4K piles */"));

test("v7.69.16 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.16");
  assert.match(server,/version: "7\.69\.16"/);
  assert.match(server,/version:"7\.69\.16"/);
  assert.match(pkg.scripts.test,/dist\/test\/v76916\.test\.js/);
});

test("catalog artwork uses a clipped wrapper in Lobby and Deckbuilder",()=>{
  assert.match(app,/class="catalog-art-window has-art"/);
  assert.match(polish,/catalog-art-stage > \.catalog-art-window[\s\S]*position:absolute;[\s\S]*inset:0;[\s\S]*overflow:hidden/);
  assert.match(polish,/catalog-art-window > img[\s\S]*object-fit:cover;[\s\S]*object-position:var\(--art-focus-x,50%\) var\(--art-focus-y,50%\)/);
});

test("hand fan paint is isolated so hover finishes cannot bleed into neighbours",()=>{
  assert.match(polish,/own-hand \.hand-fan-card \{[\s\S]*isolation:isolate;[\s\S]*backface-visibility:hidden/);
  assert.match(polish,/hand-fan-card \.card-art-stage \{[\s\S]*contain:paint;[\s\S]*isolation:isolate/);
});

test("mobile field cards restore full card anatomy instead of the compressed artwork strip",()=>{
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*board-lane \.card:not\(\.face-down-support\) \.card-art-stage \{[\s\S]*flex:0 0 auto !important;[\s\S]*aspect-ratio:16\/9/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\) \.card-rules-mini \{[\s\S]*display:-webkit-box !important;[\s\S]*-webkit-line-clamp:2/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\) \.card-tags \{[\s\S]*display:flex !important/);
});

test("4K deck is rebuilt from visible 5:7 layers with physical offsets",()=>{
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*deck-stack-visual > i,[\s\S]*width:140px;[\s\S]*height:196px/);
  assert.match(polish,/deck-stack-visual > i:first-child \{ left:0; top:12px; \}/);
  assert.match(polish,/deck-stack-visual > i:nth-child\(2\) \{ left:6px; top:6px; \}/);
  assert.match(polish,/deck-stack-visual > span \{ left:12px; top:0; \}/);
});

test("Archive stays readable at desktop and 4K without drawing a fake zero-card stack",()=>{
  assert.match(polish,/archive-compact\.is-empty summary \{ min-height:70px; \}/);
  assert.match(polish,/archive-compact\.is-empty summary \{[\s\S]*min-height:88px/);
  assert.doesNotMatch(polish,/archive-stack-empty[^\n]*display:block/);
});

console.log(`\n${passed}/${passed} v7.69.16 tests passed.`);
