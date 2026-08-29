import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const css = root("public/styles.css"), server = root("server/server.mjs"), readme = root("README.md");
const pkg = JSON.parse(root("package.json"));
test("v7.44 visual baseline remains present in later versions", () => { assert.match(readme, /## v7\.44 — Match Feedback \/ Motion \/ Responsive Visual QA/); });
test("v7.44 adds short card action feedback", () => { assert.match(css, /v744-card-land/); assert.match(css, /v744-card-attack/); assert.match(css, /v744-card-destroy/); });
test("v7.44 adds tabletop Reputation impact without blocking interaction", () => { assert.match(css, /event-reputation-changed \.battlefield-surface::after/); assert.match(css, /v744-table-impact/); });
test("v7.44 aligns combat resolution and result materials", () => { assert.match(css, /Resolution \/ combat moments now match/); assert.match(css, /Match complete reads like a result plaque/); });
test("v7.44 scales field and catalog cards together at intermediate widths", () => { assert.match(css, /@media \(min-width:761px\) and \(max-width:1040px\)/); assert.match(css, /--field-card-width:138px/); assert.match(css, /--catalog-card-width:138px/); });
test("v7.44 covers short landscape and reduced motion", () => { assert.match(css, /@media \(max-height:600px\) and \(orientation:landscape\)/); assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*v744/); assert.match(readme, /No gameplay or networking behavior changes/); });
console.log(`${passed}/6 v7.44 tests passed.`);
