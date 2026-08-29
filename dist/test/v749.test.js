import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const server = root("server/server.mjs"), readme = root("README.md"), backup = root("scripts/backup-runtime.mjs"), health = root("scripts/healthcheck.mjs"), service = root("deploy/office-card-game.service.example");
const pkg = JSON.parse(root("package.json"));
test("v7.49 hosted-operations baseline remains present", () => { assert.match(readme, /## v7\.49 — Hosted Alpha Operations/); });
test("v7.49 exposes readiness separate from health", () => { assert.match(server, /path === "\/api\/ready"/); assert.match(server, /SHUTTING_DOWN/); });
test("v7.49 handles SIGTERM and SIGINT gracefully", () => { assert.match(server, /gracefulShutdown/); assert.match(server, /checkpointTimers/); assert.match(server, /process\.once\("SIGTERM"/); assert.match(server, /server\.close/); });
test("v7.49 ships runtime backup and healthcheck scripts", () => { assert.match(backup, /Runtime backup created/); assert.match(health, /api\/ready/); assert.equal(pkg.scripts["ops:backup"], "node scripts/backup-runtime.mjs"); assert.equal(pkg.scripts["ops:health"], "node scripts/healthcheck.mjs"); });
test("v7.49 ships a systemd deployment example", () => { assert.match(service, /Restart=on-failure/); assert.match(service, /EnvironmentFile=/); assert.match(readme, /single-instance \/ local-JSON/); });
console.log(`${passed}/5 v7.49 tests passed.`);
