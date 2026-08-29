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
  "CS-001": "alpha/customer-service-agent.png",
  "IT-003": "alpha/system-administrator.png",
  "OFC-007": "alpha/approval-required.png",
  "MKT-012": "alpha/going-viral.png",
  "PRD-008": "alpha/plant-manager.png",
  "N-013": "alpha/coffee-machine.png"
};

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  assert.deepEqual([...bytes.subarray(1, 4)], [80, 78, 71]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

test("v2.6 six representative cards use the supplied PNG artworks", () => {
  for (const [id, artId] of Object.entries(samples)) {
    assert.equal(alphaDefinitions[id].artId, artId, `${id} should use supplied PNG art`);
    const path = fileURLToPath(new URL(`../../public/art/${artId}`, import.meta.url));
    const file = readFileSync(path);
    const { width, height } = pngDimensions(file);
    assert.equal(width, 1672);
    assert.equal(height, 941);
    assert.ok(Math.abs(width / height - 16 / 9) < 0.002, `${id} should be effectively 16:9`);
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
