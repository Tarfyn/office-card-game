import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name:string, fn:()=>void):void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const cards:any[] = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/cards.json",import.meta.url)),"utf8"));
const app = readFileSync(fileURLToPath(new URL("../../public/app.js",import.meta.url)),"utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css",import.meta.url)),"utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs",import.meta.url)),"utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html",import.meta.url)),"utf8");
const settings = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/match-settings.json",import.meta.url)),"utf8"));

test("v4.8 all 97 Alpha cards have compact flavor text", () => {
  assert.ok(cards.length>=97);
  assert.equal(cards.filter((card)=>typeof card.flavorText === "string" && card.flavorText.trim().length > 0).length,cards.length);
  assert.ok(cards.every((card)=>card.flavorText.length <= 80));
  assert.equal(cards.find((card)=>card.id === "IT-015")?.flavorText,"Migration is planned for Q4. Which year?");
  assert.equal(cards.find((card)=>card.id === "MKT-011")?.flavorText,"Final_final_v7.");
});

test("v4.8 content pass leaves representative gameplay definitions unchanged", () => {
  assert.equal(cards.find((card)=>card.id === "CS-017")?.rulesText,"Target 1 Ticket Action in your Archive, except Follow-Up Email; return it to your hand. You cannot play that card this turn.");
  assert.equal(cards.find((card)=>card.id === "IT-011")?.cost?.play,2);
  assert.equal(cards.find((card)=>card.id === "OFC-007")?.cardType,"INCIDENT");
  assert.equal(cards.find((card)=>card.id === "MKT-012")?.rulesText,"Your opponent loses 2 Reputation. If this is your third Marketing Action this turn, they lose 2 additional Reputation.");
  assert.equal(cards.find((card)=>card.id === "PRD-013")?.cardType,"SYSTEM");
});

test("v4.8 lobby prioritizes play and moves developer surfaces out of the main flow", () => {
  assert.match(app,/lobby-command-center/);
  assert.match(app,/OFFICE ALPHA/);
  assert.match(app,/renderStarterDeckGuide/);
  assert.match(app,/PRIVATE ROOMS/);
  assert.match(app,/lobby-playtest-drawer/);
  assert.match(app,/Developer-facing tools/);
});

test("v4.8 starter content teaches all five department identities", () => {
  assert.match(app,/React → Redirect → Reopen → Survive/);
  assert.match(app,/Setup → Automate → Generate → Deploy/);
  assert.match(app,/Coordinate → Approve → Delay → Organize/);
  assert.match(app,/Setup → Chain Actions → Build Pressure → Convert/);
  assert.match(app,/Staff line → Increase Output → Overwhelm → Break Through/);
});

test("v4.8 match end has a dedicated result and review flow with responsive styling", () => {
  assert.match(app,/match-result-panel/);
  assert.match(app,/VICTORY/);
  assert.match(app,/DEFEAT/);
  assert.match(app,/reviewCurrentMatch/);
  assert.match(app,/resultBackLobby/);
  assert.match(css,/\.match-result-panel/);
  assert.match(css,/\.starter-guide-grid/);
  assert.match(css,/@media \(max-width:760px\)/);
});

test("v4.8 remains a polish/content release with Ranked timer disabled", () => {
  assert.match(server,/version: "4\.8\.0"/);
  assert.match(html,/v4\.8 alpha playtest/i);
  assert.equal(settings.timerProfiles.find((profile:any)=>profile.id === "RANKED_STANDARD_TBD").enabled,false);
  assert.equal(settings.ranked.enabled,true);
});

console.log(`${passed}/6 v4.8 tests passed.`);
