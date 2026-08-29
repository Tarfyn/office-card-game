import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
}
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v2.2 hand cards have fixed shared dimensions", () => {
    assert.match(css, /consistent card footprint/);
    assert.match(css, /\.own-hand \.hand-fan-card \{ width:154px; height:205px;/);
    assert.match(css, /\.card:not\(\.hidden-card\) \{ display:grid; grid-template-rows:auto auto auto auto auto 1fr auto;/);
    assert.match(app, /card-tags \$\{def\.tags\?\.length \? '' : 'empty'\}/);
    assert.match(app, /card-rules-mini empty/);
});
test("v2.2 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/2 v2.2 tests passed.`);
