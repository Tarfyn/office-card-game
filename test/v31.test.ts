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
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"));

test("v3.1 mobile battlefield keeps tactical rows as horizontal swipe rails", () => {
  assert.match(css, /v3\.1 mobile crossplay foundation/);
  assert.match(css, /grid-auto-flow:column/);
  assert.match(css, /scroll-snap-type:x proximity/);
  assert.match(css, /\.slots\.employee-row[\s\S]*grid-auto-columns:138px/);
});

test("v3.1 touch UI exposes reliable navigation and larger coarse-pointer controls", () => {
  assert.match(app, /function renderMobileBoardNav\(\)/);
  assert.match(app, /data-mobile-jump="opponentBoard"/);
  assert.match(app, /scrollIntoView\(\{ behavior:'smooth', block:'start' \}\)/);
  assert.match(css, /@media \(hover:none\) and \(pointer:coarse\)/);
  assert.match(css, /\.card-info \{ width:25px; height:25px/);
});

test("v3.1 LAN serve mode enables same-network phone and desktop testing", () => {
  assert.equal(pkg.scripts["serve:lan"], "node server/server.mjs --host=0.0.0.0");
  assert.match(server, /cliValue\("host"\)/);
  assert.match(server, /networkInterfaces\(\)/);
  assert.match(server, /LAN play enabled/);
});

test("v3.1 attack connector remains scroll-aware for mobile board rails", () => {
  assert.match(app, /window\.addEventListener\('scroll', scheduleAttackConnectorDraw/);
  assert.match(app, /document\.addEventListener\('scroll', scheduleAttackConnectorDraw/);
  assert.match(app, /scheduleAttackConnectorDraw\(\);/);
});

test("v3.1 public shell version updated", () => {
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/5 v3.1 tests passed.`);
