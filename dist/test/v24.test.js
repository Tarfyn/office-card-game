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
test("v2.4 direct placement renders legal board slots instead of requiring slot buttons", () => {
    assert.match(app, /function renderFieldSlot/);
    assert.match(app, /data-field-slot-zone/);
    assert.match(app, /Choose one of the highlighted Employee slots on your board/);
    assert.match(app, /Choose one of the highlighted Support slots on your board/);
    assert.match(css, /\.empty-slot\.slot-candidate/);
});
test("v2.4 promotion slot selection can continue into a material-choice step", () => {
    assert.match(app, /interaction\.type === 'PROMOTION'/);
    assert.match(app, /data-interaction=\"promotion-option\"/);
    assert.match(app, /state\.interaction = \{ type:'PROMOTION'/);
});
test("v2.4 Employee field cards expose compact runtime badges", () => {
    assert.match(app, /card-runtime-row/);
    assert.match(app, /ONBOARDING/);
    assert.match(app, /ATTACKS/);
    assert.match(css, /\.runtime-badge\.onboarding/);
    assert.match(css, /\.runtime-badge\.attacks\.ready/);
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/3 v2.4 tests passed.`);
