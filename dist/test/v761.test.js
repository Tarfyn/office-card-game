import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const pkg = JSON.parse(root("package.json")), server = root("server/server.mjs"), html = root("public/index.html"), app = root("public/app.js"), css = root("public/styles.css"), readme = root("README.md");
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
test("v7.61 ops dashboard remains present after later versions", () => { assert.match(server, /path === "\/api\/admin\/ops"/); assert.match(app, /function renderOpsDashboard\(\)/); assert.match(css, /v7\.61 — protected Alpha operator console/); });
test("ops endpoint is admin protected and aggregates safe server state", () => { assert.match(server, /path === "\/api\/admin\/ops"/); assert.match(server, /requireAdmin\(req\)/); assert.match(server, /rooms\.listPlaytestRecords\(\)/); assert.match(server, /matchmaking\.snapshot\(\)\.tickets/); assert.match(server, /profiles\.playerSnapshot\(\)\.players\.length/); });
test("ops payload does not intentionally expose room or profile credentials", () => { const helper = server.slice(server.indexOf('function adminOpsSnapshot'), server.indexOf('function requireAdmin')); assert.doesNotMatch(helper, /profileToken|roomToken|credential|streamTicket/i); });
test("client keeps admin credential in tab-scoped storage and sends a header", () => { assert.match(app, /sessionStorage\.getItem\('office-card-game-admin-token-v1'\)/); assert.match(app, /'x-admin-token':token/); assert.doesNotMatch(app, /localStorage\.setItem\('office-card-game-admin-token-v1'/); });
test("operator console is opt-in from the lobby and responsive", () => { assert.match(app, /opsModeAvailable\(\)/); assert.match(app, /function renderOpsDashboard\(\)/); assert.match(css, /v7\.61 — protected Alpha operator console/); assert.match(css, /\.ops-grid/); });
test("README documents the protected operator flow", () => { assert.match(readme, /v7\.61 — Alpha Admin \/ Ops Dashboard/); assert.match(readme, /\?ops=1/); assert.match(readme, /sessionStorage/); });
console.log(`${passed}/6 v7.61 tests passed.`);
