import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");

const samples = ["CS-001","IT-003","OFC-007","MKT-012","PRD-008","N-013"];

test("v2.1 six representative cards expose artId sample assets", () => {
  for (const id of samples) {
    const def = alphaDefinitions[id];
    assert.ok(def.artId, `${id} should have artId`);
    const path = fileURLToPath(new URL(`../../public/art/${def.artId}`, import.meta.url));
    assert.ok(readFileSync(path).byteLength > 100, `${id} artwork asset should exist`);
  }
});

test("v2.1 browser uses artId assets and non-modal field hover preview", () => {
  assert.match(app, /function artworkUrl/);
  assert.match(app, /function renderArtwork/);
  assert.match(app, /function bindHoverPreviewHandlers/);
  assert.match(app, /hoverCardPreview/);
  assert.match(css, /\.hover-card-preview/);
  assert.match(css, /\.modal-art-window/);
});

test("v2.1 field rows use stronger physical card proportions", () => {
  assert.match(css, /slots\.employee-row/);
  assert.match(css, /slots\.support-row/);
  assert.match(css, /min-height:190px/);
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/3 v2.1 tests passed.`);
