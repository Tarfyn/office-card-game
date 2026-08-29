import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
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
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const spec = readFileSync(fileURLToPath(new URL("../../ARTWORK_SPEC.md", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
const samples = ["CS-001", "IT-003", "OFC-007", "MKT-012", "PRD-008", "N-013"];
test("v2.3 canonical artwork spec is 1600x900 16:9 with crop-safe guidance", () => {
    assert.match(spec, /1600 × 900 px/);
    assert.match(spec, /16:9/);
    assert.match(spec, /central ~70%/);
    assert.match(spec, /WebP/);
    assert.match(spec, /no card frame/i);
});
test("v2.3 artId is an extension-aware relative asset path", () => {
    assert.match(app, /`\/art\/\$\{def\.artId\}`/);
    for (const id of samples) {
        const artId = alphaDefinitions[id].artId;
        assert.ok(artId && /\.(svg|png|webp)$/i.test(artId), `${id} artId should include an extension`);
    }
});
test("v2.3 field cards and artwork crops use fixed consistent geometry", () => {
    assert.match(css, /--field-card-width: 150px/);
    assert.match(css, /--field-card-height: 210px/);
    assert.match(css, /aspect-ratio: 16 \/ 9/);
    assert.match(css, /height: var\(--field-card-height\)/);
    assert.match(css, /object-fit: cover/);
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/3 v2.3 tests passed.`);
