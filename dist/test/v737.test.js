import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analyzeContentGaps } from "../src/content-audit.js";
let passed = 0;
function test(n, f) { try {
    f();
    passed++;
    console.log(`✓ ${n}`);
}
catch (e) {
    console.error(`✗ ${n}`);
    throw e;
} }
const audit = analyzeContentGaps();
test("v7.37 audits all five departments", () => { assert.equal(audit.departments.length, 5); });
test("v7.37 identifies current shallow 15-card pools", () => { for (const dep of ["OFFICE", "MARKETING", "PRODUCTION"])
    assert.ok(audit.gaps.some(g => g.department === dep && g.kind === "POOL_DEPTH")); });
test("v7.37 frozen analysis records the one-Incident reactive pools that Expansion I targets", () => { const doc = readFileSync(fileURLToPath(new URL("../../CONTENT_GAP_ANALYSIS_v7.37.md", import.meta.url)), "utf8"); assert.match(doc, /Marketing reactive depth/i); assert.match(doc, /Production reactive depth/i); });
test("v7.37 frozen analysis records the early Employee gaps that Expansion I targets", () => { const doc = readFileSync(fileURLToPath(new URL("../../CONTENT_GAP_ANALYSIS_v7.37.md", import.meta.url)), "utf8"); assert.match(doc, /Office pool depth/i); assert.match(doc, /Customer Service early variety/i); });
test("v7.37 ships a concrete ten-card expansion target", () => { const doc = readFileSync(fileURLToPath(new URL("../../CONTENT_GAP_ANALYSIS_v7.37.md", import.meta.url)), "utf8"); assert.match(doc, /10 cards/); assert.match(doc, /engine pairs already have native bridge cards/i); });
test("v7.37 version markers are current", () => { const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8"); const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8"); assert.match(server, /version: "7\.37\.0"/); assert.match(html, /v7\.37 Alpha Playtest/i); });
console.log(`${passed}/6 v7.37 tests passed.`);
