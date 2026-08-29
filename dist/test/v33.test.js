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
test("v3.3 game chrome collapses prototype utilities behind one playtest drawer", () => {
    assert.match(app, /class="playtest-tools"/);
    assert.match(app, /Room details · advanced controls · event log/);
    assert.match(css, /\.playtest-tools-grid/);
});
test("v3.3 command dock only occupies the board when a primary action exists", () => {
    assert.match(app, /const hasPrimaryAction = Boolean\(legal\.canAdvancePhase \|\| abilityCount\)/);
    assert.match(app, /if \(!hasPrimaryAction\) return '';/);
});
test("v3.3 mobile polish preserves controls while reducing chrome", () => {
    assert.match(css, /v3\.3 product polish: game-first chrome \+ visual economy loop/);
    assert.match(css, /\.topbar \.muted \{ display:none; \}/);
    assert.match(css, /\.command-dock \.command-hint \{ display:none; \}/);
    assert.match(css, /\.mobile-board-nav button \{ min-height:30px/);
});
test("v3.3 booster reveal uses artwork and current owned copy count", () => {
    assert.match(app, /class="booster-hit-art"/);
    assert.match(app, /OWNED \$\{esc\(ownedCopies\(id\)\)\}/);
    assert.match(app, /class="economy-loop"/);
    assert.match(css, /\.booster-hit-art img/);
});
test("v3.3 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/5 v3.3 tests passed.`);
