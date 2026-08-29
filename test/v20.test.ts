import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");

test("v2.0 own hand uses indexed fan cards and hover-forward styling", () => {
  assert.match(app, /handIndex:i, handCount:player\.hand\.length/);
  assert.match(app, /hand-fan-card/);
  assert.match(css, /\/\* hand fan \*\//);
  assert.match(css, /--hand-rot/);
  assert.match(css, /translateY\(-22px\)/);
});

test("v2.0 cards expose an artwork window and stronger type frame", () => {
  assert.match(app, /card-art-window/);
  assert.match(app, /departmentMark/);
  assert.match(css, /first real frame prototype/);
  assert.match(css, /\.card-art-window/);
  assert.match(css, /\.card\.type-employee/);
  assert.match(css, /\.card\.type-incident/);
  assert.match(css, /\.card\.type-action/);
  assert.match(css, /\.card\.type-system/);
});

test("v2.0 targeting and response presentation are game-facing", () => {
  assert.match(app, /interactionMode/);
  assert.match(app, /response-active/);
  assert.match(css, /interaction-targets/);
  assert.match(css, /RESPONSE WINDOW/);
  assert.match(css, /\.response-card:hover/);
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/3 v2.0 tests passed.`);
