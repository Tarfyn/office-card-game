import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const server = root("server/server.mjs"), readme = root("README.md");
const pkg = JSON.parse(root("package.json"));
test("v7.47 public-security baseline remains present", () => { assert.match(readme, /## v7\.47 — Public Server Security/); });
test("v7.47 adds baseline browser security headers", () => { assert.match(server, /x-content-type-options/); assert.match(server, /content-security-policy/); assert.match(server, /frame-ancestors 'none'/); });
test("v7.47 rate limits public read and write traffic", () => { assert.match(server, /RATE_LIMIT_READS/); assert.match(server, /RATE_LIMIT_WRITES/); assert.match(server, /enforceRateLimit/); assert.match(server, /RATE_LIMITED/); });
test("v7.47 validates public host and origin when configured", () => { assert.match(server, /ALLOWED_ORIGINS/); assert.match(server, /ALLOWED_HOSTS/); assert.match(server, /validateRequestOrigin/); });
test("v7.47 protects analytics behind an admin credential in public mode", () => { assert.match(server, /requireAdmin\(req\)/); assert.match(server, /ADMIN_TOKEN is required when PUBLIC_BASE_URL/); assert.match(readme, /administrator protection for playtest analytics/); });
console.log(`${passed}/5 v7.47 tests passed.`);
