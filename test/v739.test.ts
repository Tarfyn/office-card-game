import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const css=root("public/styles.css"); const html=root("public/index.html"); const server=root("server/server.mjs"); const pkg=JSON.parse(root("package.json")); const readme=root("README.md");
test("v7.41 visual baseline remains present in later versions",()=>{ assert.ok(Number(pkg.version.split(".")[1]) >= 41); assert.match(css,/board depth \+ zone polish/); });
test("v7.41 keeps canonical card footprint from v7.40",()=>{ assert.match(css,/--catalog-card-width: 150px/); assert.match(css,/--field-card-width: 150px/); });
test("v7.41 deepens the battlefield without changing lane structure",()=>{ assert.match(css,/board depth \+ zone polish/); assert.match(css,/\.battlefield-surface \.board-lane \{/); assert.match(css,/\.battlefield-surface \.employee-lane/); assert.match(css,/\.battlefield-surface \.support-lane/); });
test("v7.41 gives empty slots a quieter physical placeholder treatment",()=>{ assert.match(css,/\.battlefield-surface \.field-empty:not\(\.slot-candidate\)/); assert.match(css,/border:1px dashed rgba\(200,191,169,.15\)/); });
test("v7.41 keeps legal slot candidates visually distinct",()=>{ assert.match(css,/\.battlefield-surface \.field-empty\.slot-candidate/); assert.match(css,/rgba\(105,208,143,.58\)/); });
test("v7.41 preserves responsive board behavior",()=>{ assert.match(css,/@media \(max-width:760px\) \{[\s\S]*\.battlefield-surface \.board-lane/); assert.match(readme,/v7\.41 — Board Depth & Zone Polish/); });
console.log(`${passed}/6 v7.41 tests passed.`);
