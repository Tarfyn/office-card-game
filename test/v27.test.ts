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

test("v2.7 keeps tag footer readable within card frame", () => {
  assert.match(app, /hasPower = def\?\.cardType === 'EMPLOYEE' && card\.currentPower != null/);
  assert.match(css, /v2\.7 tag readability \+ unified close-up card/);
  assert.match(css, /\.card\.has-power \.card-tags \{ padding-right: 32px; \}/);
  assert.match(css, /\.card-tags \{\s*flex: 0 0 22px;/s);
  assert.match(css, /\.card-rules-mini \{\s*min-height: 31px;/s);
});

test("v2.7 closeup uses a large version of the same card frame", () => {
  assert.match(app, /function renderModalCardFace\(card, def\)/);
  assert.match(app, /class="card modal-card-face/);
  assert.match(app, /renderModalCardFace\(card, def\)/);
  assert.match(css, /\.modal-card-face \{/);
  assert.match(css, /\.card-modal\.frame-modal \{/);
});

test("v2.7 public shell version updated", () => {
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/3 v2.7 tests passed.`);
