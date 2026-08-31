import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const pkg = JSON.parse(root("package.json"));
const app = root("public/app.js");
const css = root("public/styles.css");
const server = root("server/server.mjs");
const html = root("public/index.html");
const readme = root("README.md");

test("v7.69.21 version markers are current", () => {
  assert.equal(pkg.version, "7.69.21");
  assert.match(pkg.scripts.test, /dist\/test\/v76921\.test\.js/);
  assert.match(server, /version: "7\.69\.21"/);
  assert.match(server, /Office Card Game v7\.69\.21 server/);
  assert.match(html, /v7\.69\.21 Alpha Playtest/);
  assert.match(readme, /## v7\.69\.21 — Isolated Subtle-Perspective Board Prototype/);
});

test("perspective is opt-in and isolated to desktop world geometry", () => {
  assert.match(app, /perspectiveMode = new URLSearchParams\(window\.location\.search\)\.get\('perspective'\) === 'tilt'/);
  assert.match(app, /class="battlefield-world"/);
  assert.match(css, /\.battlefield-world,\s*\.player-world \{ display:contents; \}/);
  assert.match(css, /\.game-shell\.perspective-prototype \.battlefield-world[\s\S]*transform:perspective\(2400px\) rotateX\(\.82deg\) scaleY\(\.994\)/);
  assert.match(css, /\.game-shell\.perspective-prototype \.player-world \{ display:contents; \}/);
});

test("flat overlays and mobile remain outside the transformed world", () => {
  assert.match(app, /battlefield-world[\s\S]*renderBoardPhaseDivider\(match\)[\s\S]*renderDecisionCenter\(match\)/);
  assert.match(css, /\.game-shell\.perspective-prototype \.board-phase-divider,\s*[\s\S]*\.decision-center \{[\s\S]*grid-column:1/);
  assert.match(css, /@media \(min-width:1181px\) and \(min-height:601px\)/);
  assert.match(css, /\.player-board > \.player-world > \.zone-title \{ display:none !important; \}/);
});

console.log(`\n${passed}/${passed} v7.69.21 tests passed.`);
