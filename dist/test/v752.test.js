import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const app = root("public/app.js"), css = root("public/styles.css"), server = root("server/server.mjs"), pkg = JSON.parse(root("package.json"));
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
test("v7.52 version markers", () => { assert.ok(Number(String(pkg.version).split(".")[1]) >= 52); assert.match(server, /version: "7\.\d+\.0"/); });
test("diagnostics expose server network and SSE state", () => { assert.match(app, /ROUND TRIP/); assert.match(app, /LIVE SYNC/); assert.match(app, /Last live:/); });
test("diagnostics can probe health", () => { assert.match(app, /refreshConnectionDiagnostics/); assert.match(app, /api\('\/api\/health'\)/); });
test("room diagnostics surface authoritative state version", () => assert.match(app, /state v\$\{esc\(match\.stateVersion\)\}/));
test("diagnostics appear across lobby waiting and match tools", () => { assert.ok((app.match(/renderConnectionDiagnosticsPanel/g) || []).length >= 4); });
test("diagnostics are responsive", () => assert.match(css, /connection-diagnostics-grid/));
console.log(`${passed}/6 v7.52 tests passed.`);
