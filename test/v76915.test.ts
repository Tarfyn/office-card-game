import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const rootPath=(name:string)=>fileURLToPath(new URL(`../../${name}`,import.meta.url));
const pkg=JSON.parse(root("package.json"));
const css=root("public/styles.css");
const app=root("public/app.js");
const polish=css.slice(css.lastIndexOf("/* v7.69.15 — board-skin clarity, resource rail balance + lobby large-card finish */"));

  test("v7.69.15 version is current",()=>assert.equal(pkg.version,"7.69.47"));
test("board skin lanes become transparent while slots remain available",()=>{
  assert.match(polish,/player-board\[class\*="board-skin-"\] \.board-lane[\s\S]*background:transparent !important/);
  assert.match(polish,/board-lane::before \{ display:none !important; \}/);
});
test("mobile support row is centered as an 80 percent four-slot group",()=>{
  assert.match(polish,/slots\.support-row,[\s\S]*width:80%;[\s\S]*margin-inline:auto;[\s\S]*repeat\(4,minmax\(0,1fr\)\)/);
});
test("lobby showcase keeps shared catalog renderer and footer tags",()=>{
  assert.match(app,/return renderCatalogCardFace\(def,\{ artReady:Boolean\(def\.artId\), variantId \}\)/);
  assert.match(polish,/desk-card-fan-item > \.catalog-card-face \.catalog-tags \{ margin-top:auto; \}/);
});
test("lobby removes legacy art sweep without disabling shared foil masks",()=>{
  assert.match(polish,/desk-card-fan-item \.catalog-foil-sheen \{ display:none !important; \}/);
  assert.match(css,/desk-card-fan-item:hover > \.catalog-card-face\.tier-t2 \.catalog-art-stage::after/);
});
test("new classic office board asset is present",()=>assert.ok(readFileSync(rootPath("public/cosmetics/boards/classic-office.webp")).byteLength>100000));
console.log(`\n${passed}/${passed} v7.69.15 tests passed.`);
