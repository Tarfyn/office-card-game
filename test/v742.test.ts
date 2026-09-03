import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log(`✓ ${name}`);}
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const css=root("public/styles.css");
const server=root("server/server.mjs");
const pkg=JSON.parse(root("package.json"));
const readme=root("README.md");

test("v7.42 finish baseline remains present in later versions",()=>{
  assert.ok(Number(pkg.version.split(".")[1]) >= 42);
  assert.match(css,/T3: premium prismatic shard foil/);
});
test("v7.42 gives T2 a dedicated soft spectrum mask",()=>{
  assert.match(css,/T2: soft-spectrum laminated film/);
  assert.match(css,/\.card\.tier-t2 \.card-art-stage::after/);
  assert.match(css,/repeating-linear-gradient\(102deg/);
});
test("v7.42 gives T3 a distinct prismatic shard mask",()=>{
  assert.match(css,/T3: premium prismatic shard foil/);
  assert.match(css,/\.card\.tier-t3 \.card-art-stage::after/);
  assert.match(css,/conic-gradient\(from 28deg/);
});
test("v7.42 applies foil to catalog surfaces too",()=>{
  assert.match(css,/\.catalog-card-face\.tier-t2 \.catalog-art-stage::after/);
  assert.match(css,/\.catalog-card-face\.tier-t3 \.catalog-art-stage::after/);
});
test("v7.42 keeps finish out of rules text",()=>{
  assert.doesNotMatch(css,/tier-t[23][^\n]*\.card-rules-mini::/);
  assert.match(readme,/Foil remains scoped to the artwork stage/);
});
test("v7.42 keeps reduced-motion fallback",()=>{
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/transition:none !important/);
});
test("v7.69.43 removes the obsolete T1 silver corner treatment",()=>{
  assert.doesNotMatch(css,/\.card\.tier-t1:not\(\.hidden-card\)::before|\.catalog-card-face\.tier-t1::before/);
  assert.match(css,/\.card\.tier-t1 \.card-name[\s\S]*background:linear-gradient\(180deg,#456066/);
});
test("v7.69.43 gives T1/T2/T3 restrained metallic typography",()=>{
  assert.match(css,/\.card\.tier-t2 \.card-name[\s\S]*background:linear-gradient\(180deg,#a97924/);
  assert.match(css,/-webkit-background-clip:text/);
  assert.match(css,/-webkit-text-fill-color:transparent/);
  assert.match(css,/text-shadow:0 1px rgba\(255,244,196,.72\)/);
});
console.log(`${passed}/8 v7.42/v7.69.43 tests passed.`);
