import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const samples: Record<string,string> = {
  "CS-001": "alpha/customer-service-agent.webp",
  "IT-003": "alpha/system-administrator.webp",
  "OFC-007": "alpha/approval-required.png",
  "MKT-012": "alpha/going-viral.webp",
  "PRD-008": "alpha/plant-manager.webp",
  "N-013": "alpha/coffee-machine.webp"
};

test("v2.6 representative real artworks remain wired after the WebP batch migration", () => {
  for (const [id, artId] of Object.entries(samples)) {
    assert.equal(alphaDefinitions[id].artId, artId, `${id} should keep production art`);
    const path = fileURLToPath(new URL(`../../public/art/${artId}`, import.meta.url));
    const file = readFileSync(path);
    assert.ok(file.length > 1000, `${id} artwork should be a real raster asset`);
    assert.match(artId, /\.(?:png|webp)$/i);
  }
});

test("v2.6 artwork loader keeps extension-aware artId paths", () => {
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  assert.match(app, /return def\?\.artId \? `\/art\/\$\{def\.artId\}` : null/);
  assert.match(app, /object-fit:cover|renderArtwork/);
});

test("v2.6 public shell version updated", () => {
  const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
  assert.match(html, /alpha playtest/);
});

console.log(`${passed}/3 v2.6 tests passed.`);
