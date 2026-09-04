import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name:string, fn:()=>void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name:string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const css = root("public/styles.css");

function sliceBetween(source:string, start:string, end:string) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0, `missing ${start}`);
  assert.ok(b > a, `missing ${end}`);
  return source.slice(a, b);
}

test("per-seat Match HUD projects Badge without replacing the Title", () => {
  const hud = sliceBetween(app, "function renderPlayerBadge", "function actionButton");
  assert.match(hud, /roomCosmeticLoadout\(playerId\)\.badgeId/);
  assert.match(hud, /player-badge-mark/);
  assert.match(hud, /player-title-slot/);
  assert.match(hud, /renderPlayerBadge\(player\.id\)/);
  assert.match(app, /COS-BADGE-001/);
  assert.match(app, /COS-BADGE-006/);
});

test("Match HUD badge is compact and absent cosmetics leave no placeholder", () => {
  assert.match(css, /\.player-badge-mark \{[\s\S]*?flex:0 0 28px/);
  assert.match(css, /@media \(max-width:760px\)[\s\S]*?\.player-badge-mark \{[\s\S]*?flex-basis:22px/);
  assert.match(app, /if \(!badge\) return ''/);
});

test("authoritative end is visually gated once, with reload and reduced-motion safety", () => {
  assert.match(app, /function syncMatchResultPresentationGate\(view, previousView\)/);
  assert.match(app, /historical events are state hydration, not new visual work/);
  assert.match(app, /match\.reason === 'RESIGN' \? 0/);
  assert.match(app, /RESULT_PRESENTATION_MAX_MS = 4200/);
  assert.match(app, /prefersReducedMotion\(\)/);
  assert.match(app, /state\.matchResultGate\?\.key === key/);
  assert.match(app, /function matchResultPresentationReady\(match\)/);
  assert.match(app, /!matchResultPresentationReady\(match\)/);
});

test("final resolution cues remain one-shot across normal render cycles", () => {
  const combat = sliceBetween(app, "function syncCombatPresentationHost", "function resolutionOutcomeEvent");
  assert.match(combat, /host\.dataset\.presentationKey === key\) return/);
  assert.match(app, /if \(!present\) return;/);
  assert.match(app, /state\.renderedMotionCueKeys/);
  assert.match(app, /state\.matchResultGateTimer = setTimeout\(\(\) => resolveMatchResultPresentationGate\(key\), delay\)/);
});

console.log(`\n${passed}/${passed} Match presentation tests passed.`);
