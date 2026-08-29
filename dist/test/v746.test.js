import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const server = root("server/server.mjs"), app = root("public/app.js"), readme = root("README.md");
const pkg = JSON.parse(root("package.json"));
test("v7.46 auth-hardening baseline remains present", () => { assert.match(readme, /## v7\.46 — Internet Auth Hardening/); });
test("v7.46 supports header-based profile and room credentials", () => { assert.match(server, /function bearerToken\(req\)/); assert.match(server, /x-room-token/); assert.match(app, /function profileAuthHeaders/); assert.match(app, /function roomAuthHeaders/); });
test("v7.46 removes normal client room tokens from API URLs", () => { assert.doesNotMatch(app, /state\?token=/); assert.doesNotMatch(app, /intent\?token=/); assert.doesNotMatch(app, /abandon\?token=/); });
test("v7.46 uses short-lived SSE stream tickets", () => { assert.match(server, /issueStreamTicket/); assert.match(server, /5 \* 60_000/); assert.match(server, /stream-ticket/); assert.match(app, /stream-ticket/); assert.match(app, /stream\?ticket=/); });
test("v7.46 fetches replay export with Authorization instead of a profile-token URL", () => { assert.match(app, /replay\/export`, \{ headers:profileAuthHeaders\(\) \}/); assert.doesNotMatch(app, /replay\/export\?profileToken=/); assert.match(readme, /short-lived five-minute stream ticket/); });
console.log(`${passed}/5 v7.46 tests passed.`);
