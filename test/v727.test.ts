import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed=0; function test(name:string,fn:()=>void){try{fn();passed++;console.log(`✓ ${name}`)}catch(e){console.error(`✗ ${name}`);throw e}}
const app=readFileSync(fileURLToPath(new URL("../../public/app.js",import.meta.url)),"utf8");
const css=readFileSync(fileURLToPath(new URL("../../public/styles.css",import.meta.url)),"utf8");
const projection=readFileSync(fileURLToPath(new URL("../../src/projection.ts",import.meta.url)),"utf8");
const engine=readFileSync(fileURLToPath(new URL("../../src/engine.ts",import.meta.url)),"utf8");
const server=readFileSync(fileURLToPath(new URL("../../server/server.mjs",import.meta.url)),"utf8");
const html=readFileSync(fileURLToPath(new URL("../../public/index.html",import.meta.url)),"utf8");
test("v7.27 stores status provenance for keywords shields and attack restrictions",()=>{assert.match(engine,/attackRestrictionSourceInstanceId = context\.sourceId/);assert.match(engine,/sourceInstanceId: context\.sourceId[\s\S]*keyword/);assert.match(engine,/duration: effect\.duration[\s\S]*expiresAfterChainItemId/) });
test("v7.27 projects viewer-safe live card statuses",()=>{assert.match(projection,/function projectLiveStatuses/);assert.match(projection,/projectedSourceIdentity/);assert.match(projection,/view\.liveStatuses = projectLiveStatuses/);assert.match(projection,/sourceRef !== sourceInstanceId/) });
test("v7.27 covers onboarding attack state keyword shield and altered attack limit",()=>{for(const token of ['ONBOARDING','ATTACK_USED','ATTACK_RESTRICTED','KEYWORD','DESTRUCTION_SHIELD','ATTACK_LIMIT'])assert.match(projection,new RegExp(token))});
test("v7.27 inspector joins card statuses with scheduled and pending source effects",()=>{assert.match(app,/ACTIVE EFFECTS & STATUS/);assert.match(app,/SCHEDULED EFFECT/);assert.match(app,/PENDING RESOLUTION/);assert.match(app,/liveStatusDurationLabel/) });
test("v7.27 status provenance is compact on mobile",()=>{assert.match(css,/\.live-status-provenance/);assert.match(css,/\.live-status-row\.kind-attack_restricted/);assert.match(css,/@media \(max-width:760px\)[\s\S]*\.live-status-row/) });
test("v7.27 version markers are current",()=>{assert.match(server,/version: "7\.27\.0"/);assert.match(html,/v7\.27 Alpha Playtest/i)});
console.log(`${passed}/6 v7.27 tests passed.`);
