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
test("v1.9 browser exposes mirrored battlefield helpers", () => {
    assert.match(app, /function renderOpponentHand/);
    assert.match(app, /const frontline =/);
    assert.match(app, /const backline =/);
    assert.match(app, /own \? frontline \+ backline : backline \+ frontline/);
    assert.match(css, /\.opponent-hand-fan/);
    assert.match(css, /\.opponent-hand-card/);
    assert.match(css, /mirrored battlefield/);
});
test("v1.9 public shell advertises mirrored board version", () => {
    const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
    assert.match(html, /Office Card Game/);
});
console.log(`${passed}/2 v1.9 tests passed.`);
