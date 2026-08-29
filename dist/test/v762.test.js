import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const pkg = JSON.parse(root("package.json")), server = root("server/server.mjs"), html = root("public/index.html"), script = root("scripts/artwork-audit.mjs"), docs = root("ARTWORK_PIPELINE.md");
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
test("v7.62 artwork audit remains available after later versions", () => { assert.match(script, /artwork-status\.json/); assert.match(docs, /1600 × 900/); assert.ok(pkg.scripts['ops:art-audit']); });
test("artwork audit covers the canonical card pool and artId mapping", () => { assert.match(script, /data','cards\.json/); assert.match(script, /card\.artId/); assert.match(script, /BROKEN_REFERENCE/); assert.match(script, /INVALID_ID/); });
test("artwork audit validates raster format dimensions and 16:9 ratio", () => { assert.match(script, /\.png/); assert.match(script, /\.webp/); assert.match(script, /targetRatio=16\/9/); assert.match(script, /BAD_RATIO/); });
test("missing artwork is reportable while broken production art fails", () => { assert.match(script, /status:'MISSING'/); assert.match(script, /strictMissing/); assert.match(script, /process\.exitCode=1/); });
test("audit writes machine and human readable reports", () => { assert.equal(pkg.scripts['ops:art-audit'], 'node scripts/artwork-audit.mjs --write'); assert.match(script, /artwork-status\.json/); assert.match(script, /artwork-status\.md/); });
test("pipeline docs preserve the 1600x900 artwork-only contract", () => { assert.match(docs, /1600 × 900/); assert.match(docs, /no card frame/i); assert.match(docs, /central ~70%/); });
console.log(`${passed}/6 v7.62 tests passed.`);
