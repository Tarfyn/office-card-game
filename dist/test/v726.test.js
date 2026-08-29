import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(name, fn) { try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
}
catch (e) {
    console.error(`✗ ${name}`);
    throw e;
} }
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const projection = readFileSync(fileURLToPath(new URL("../../src/projection.ts", import.meta.url)), "utf8");
const engine = readFileSync(fileURLToPath(new URL("../../src/engine.ts", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v7.26 exposes explainable Power contributions without changing getCurrentPower semantics", () => { assert.match(engine, /export function getPowerBreakdown/); assert.match(engine, /kind: "CONTINUOUS"/); assert.match(engine, /kind: "TEMPORARY"/); assert.match(engine, /return getPowerBreakdown\(state, instanceId\)\.current/); });
test("v7.26 stores temporary modifier provenance", () => { assert.match(engine, /sourceInstanceId: context\.sourceId/); assert.match(engine, /abilityId: context\.abilityId/); assert.match(engine, /duration: effect\.duration/); });
test("v7.26 projection only exposes source identity when the source reference is viewer-visible", () => { assert.match(projection, /sourceRef === contribution\.sourceInstanceId/); assert.match(projection, /sourceDefinitionId/); assert.match(projection, /view\.powerBreakdown = projectPowerBreakdown/); });
test("v7.26 inspector renders a Printed to Current Power breakdown", () => { assert.match(app, /function renderPowerBreakdown/); assert.match(app, /POWER BREAKDOWN/); assert.match(app, /Printed Power/); assert.match(app, /While source is active/); });
test("v7.26 breakdown is responsive and uses positive\/negative modifier tones", () => { assert.match(css, /\.power-breakdown/); assert.match(css, /\.power-breakdown-row\.positive/); assert.match(css, /\.power-breakdown-row\.negative/); assert.match(css, /@media \(max-width:760px\)[\s\S]*\.power-breakdown-row/); });
test("v7.26 version markers are current", () => { assert.match(server, /version: "7\.26\.0"/); assert.match(html, /v7\.26 Alpha Playtest/i); });
console.log(`${passed}/6 v7.26 tests passed.`);
