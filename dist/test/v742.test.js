import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }
const root = (name) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const css = root("public/styles.css");
const server = root("server/server.mjs");
const pkg = JSON.parse(root("package.json"));
const readme = root("README.md");
test("v7.42 finish baseline remains present in later versions", () => {
    assert.ok(Number(pkg.version.split(".")[1]) >= 42);
    assert.match(css, /T3: premium prismatic shard foil/);
});
test("v7.42 gives T2 a dedicated soft spectrum mask", () => {
    assert.match(css, /T2: soft-spectrum laminated film/);
    assert.match(css, /\.card\.tier-t2 \.card-art-stage::after/);
    assert.match(css, /repeating-linear-gradient\(102deg/);
});
test("v7.42 gives T3 a distinct prismatic shard mask", () => {
    assert.match(css, /T3: premium prismatic shard foil/);
    assert.match(css, /\.card\.tier-t3 \.card-art-stage::after/);
    assert.match(css, /conic-gradient\(from 28deg/);
});
test("v7.42 applies foil to catalog surfaces too", () => {
    assert.match(css, /\.catalog-card-face\.tier-t2 \.catalog-art-stage::after/);
    assert.match(css, /\.catalog-card-face\.tier-t3 \.catalog-art-stage::after/);
});
test("v7.42 keeps finish out of rules text", () => {
    assert.doesNotMatch(css, /tier-t[23][^\n]*\.card-rules-mini::/);
    assert.match(readme, /Foil remains scoped to the artwork stage/);
});
test("v7.42 keeps reduced-motion fallback", () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /transition:none !important/);
});
console.log(`${passed}/6 v7.42 tests passed.`);
