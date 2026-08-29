import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const server = root("server/server.mjs"), readme = root("README.md");
const pkg = JSON.parse(root("package.json"));
test("v7.45 internet server baseline remains present", () => { assert.match(readme, /## v7\.45 — Internet Server Mode/); });
test("v7.45 exposes explicit public server configuration", () => { assert.match(server, /PUBLIC_BASE_URL/); assert.match(server, /RUNTIME_DIR/); assert.match(server, /SERVER_MODE/); });
test("v7.45 puts default persistence under the configured runtime directory", () => { assert.match(server, /join\(RUNTIME_DIR, "rooms\.local\.json"\)/); assert.match(server, /join\(RUNTIME_DIR, "players\.local\.json"\)/); });
test("v7.45 ships a public bind script", () => { assert.equal(pkg.scripts["serve:public"], "node server/server.mjs --host=0.0.0.0"); });
test("v7.45 documents reverse-proxy friendly deployment input", () => { assert.match(readme, /PUBLIC_BASE_URL=https:\/\/play\.example\.com/); assert.match(readme, /RUNTIME_DIR=\/srv\/office-card-game\/runtime/); });
console.log(`${passed}/5 v7.45 tests passed.`);
