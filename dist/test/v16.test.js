import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runBalanceSeries } from "../src/balance.js";
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
test("build pipeline is shell-command free and cross-platform", () => {
    const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const buildPath = fileURLToPath(new URL("../../scripts/build.mjs", import.meta.url));
    const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
    const build = readFileSync(buildPath, "utf8");
    assert.equal(pkg.scripts.build, "node scripts/build.mjs");
    assert.doesNotMatch(pkg.scripts.build, /\brm\b|\bcp\b|mkdir\s+-p/);
    assert.match(build, /rmSync/);
    assert.match(build, /copyFileSync/);
    assert.match(build, /process\.platform === 'win32'/);
});
test("v1.6 balance telemetry exposes per-deck summaries", () => {
    const report = runBalanceSeries({ gamesPerMatchup: 1, baseSeed: 16601, maxTurns: 18, maxSteps: 1200 });
    assert.match(report.engineVersion, /^1\.[6-9]\.|^[2-9]\./);
    assert.match(report.note, /archetype-aware/i);
    assert.equal(report.decks.length, 5);
    assert.equal(report.games.length, 10);
    assert.ok(report.decks.every((deck) => deck.games === 4));
    assert.ok(report.games.every((game) => game.reason !== "BOT_STUCK"));
});
test("browser exposes game-facing turn banner and lightweight event cues", () => {
    const appPath = fileURLToPath(new URL("../../public/app.js", import.meta.url));
    const cssPath = fileURLToPath(new URL("../../public/styles.css", import.meta.url));
    const app = readFileSync(appPath, "utf8");
    const css = readFileSync(cssPath, "utf8");
    assert.match(app, /function turnStatus/);
    assert.match(app, /renderVisualCue/);
    assert.match(app, /YOUR RESPONSE/);
    assert.match(css, /\.turn-banner/);
    assert.match(css, /@keyframes cue-pop/);
    assert.match(css, /prefers-reduced-motion/);
});
console.log(`${passed}/3 v1.6 tests passed.`);
