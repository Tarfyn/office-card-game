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

test("v2.5 card face uses compact department, cost badge and structured detail row", () => {
  assert.match(app, /function departmentCode/);
  assert.match(app, /function cardCostParts/);
  assert.match(app, /card-name-row/);
  assert.match(app, /card-cost-badge/);
  assert.match(app, /card-detail-row/);
  assert.match(app, /card-art-stage/);
});

test("v2.5 refined frame prioritizes header, artwork, rules and footer", () => {
  assert.match(css, /v2\.5 refined card frame \+ information hierarchy/);
  assert.match(css, /\.card-name-row/);
  assert.match(css, /\.card-cost-badge/);
  assert.match(css, /\.card-detail-row/);
  assert.match(css, /\.card-art-stage \.card-runtime-row/);
  assert.match(css, /\.hover-tags/);
});

test("v2.5 public shell version updated", () => {
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/3 v2.5 tests passed.`);
