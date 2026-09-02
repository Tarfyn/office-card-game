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

test("v7.69.26 version markers are current", () => {
  assert.equal(pkg.version, "7.69.31");
  assert.match(pkg.scripts.test, /dist\/test\/v76921\.test\.js/);
  assert.match(server, /version: "7\.69\.31"/);
  assert.match(server, /Office Card Game v7\.69\.31 server/);
  assert.match(html, /v7\.69\.29 Alpha Playtest/);
  assert.match(readme, /## v7\.69\.22 — Normalized Desktop Field Spacing/);
});

test("accepted perspective is the normal desktop world geometry", () => {
  assert.match(app, /const perspectiveMode = ' perspective-prototype';/);
  assert.doesNotMatch(app, /perspectiveVariant|perspective-mild|perspective-strong|perspective=tilt/);
  assert.match(app, /class="battlefield-world"/);
  assert.match(css, /\.battlefield-world,\s*\.player-world \{ display:contents; \}/);
  assert.match(css, /\.game-shell\.perspective-prototype \.player-board > \.player-world[\s\S]*transform:perspective\(2200px\) rotateX\(3\.25deg\) scaleY\(\.972\)/);
  assert.match(css, /\.game-shell\.perspective-prototype \.battlefield-world[\s\S]*transform:none/);
});

test("desktop field rows use available height and keep the own hand in its own band", () => {
  assert.match(css, /--desktop-field-card-height:min\(calc\(var\(--desktop-field-card-width\) \* 1\.4\), calc\(18\.5dvh - 55px\)\)/);
  assert.match(css, /\.own-board \{[\s\S]*padding-bottom:0;[\s\S]*grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\) var\(--desktop-hand-row-height\)/);
  assert.match(css, /\.own-hand \{[\s\S]*position:relative;[\s\S]*grid-row:3;/);
  assert.match(css, /\.player-board \{[\s\S]*gap:var\(--desktop-field-row-gap\)/);
  assert.match(css, /\.battlefield-world > \.player-board \{[\s\S]*display:block;[\s\S]*padding:0;/);
});

test("desktop field rows use a responsive horizontal cluster gap", () => {
  assert.match(css, /--desktop-field-column-gap:clamp\(18px,1vw,30px\)/);
  assert.match(css, /--desktop-field-track-width:calc\(var\(--desktop-field-card-height\) \* 5 \/ 7\)/);
  assert.match(css, /\.slots\.employee-row,\s*[\s\S]*\.slots\.support-row,\s*[\s\S]*\.slots\.support \{[\s\S]*column-gap:var\(--desktop-field-column-gap\);[\s\S]*row-gap:clamp\(6px,\.21vw,8px\)/);
  assert.match(css, /\.slots\.employee-row \{[\s\S]*grid-template-columns:repeat\(5,minmax\(0,var\(--desktop-field-track-width\)\)\) !important;/);
  assert.match(css, /\.slots\.support-row,\s*[\s\S]*\.slots\.support \{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,var\(--desktop-field-track-width\)\)\) !important;/);
  assert.match(css, /\.employee-row > \.card,[\s\S]*\.support-row > \.empty-slot \{[\s\S]*width:var\(--desktop-field-track-width\) !important;[\s\S]*max-width:var\(--desktop-field-track-width\) !important;/);
});

test("desktop field rows share one horizontal halfboard geometry", () => {
  assert.match(css, /\.game-shell\.perspective-prototype \.player-board > \.player-world \{[\s\S]*padding:98px 104px 0;/);
  assert.doesNotMatch(css, /padding:98px 104px 0 158px/);
});

test("flat overlays and mobile remain outside the transformed world", () => {
  assert.match(app, /battlefield-world[\s\S]*renderBoardPhaseDivider\(match\)[\s\S]*renderDecisionCenter\(match\)/);
  assert.match(css, /\.game-shell\.perspective-prototype \.board-phase-divider,\s*[\s\S]*\.decision-center \{[\s\S]*grid-column:1/);
  assert.match(css, /@media \(min-width:1181px\) and \(min-height:601px\)/);
  assert.match(css, /\.player-board > \.player-world > \.zone-title \{ display:none !important; \}/);
});

console.log(`\n${passed}/${passed} v7.69.26 tests passed.`);
