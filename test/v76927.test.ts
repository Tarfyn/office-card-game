import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const css = root("public/styles.css");
const en = root("public/locales/en.js");
const de = root("public/locales/de.js");
function between(source: string, start: string, end: string) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing ${start} or ${end}`);
  return source.slice(a, b);
}

test("target and promotion interactions render outside the central decision center", () => {
  const decision = between(app, "function renderDecisionCenter", "function renderArchiveStackVisual");
  const game = between(app, "function renderGame()", "function render()");
  assert.doesNotMatch(decision, /renderInteraction\(match\)/);
  assert.doesNotMatch(decision, /blocks\.push\([^\n]*Triggered effect needs a target/);
  assert.doesNotMatch(decision, /blocks\.push\([^\n]*Choose \$\{match\.pendingHandSelection/);
  assert.doesNotMatch(decision, /blocks\.push\([^\n]*Choose a card/);
  assert.match(app, /function renderBoardInteractionPanel\(match\)/);
  assert.match(game, /renderBoardInteractionPanel\(match\)/);
});

test("pre-commit target choices are cancellable while mandatory server choices are not", () => {
  assert.match(app, /function cancelInteraction\(\) \{\s*if \(state\.interaction\?\.cancelable === false\) return;/);
  assert.match(app, /state\.interaction\.cancelable = true/);
  assert.match(app, /function beginMandatoryTargetIntent\(/);
  assert.match(app, /state\.interaction\.cancelable = false/);
  const interaction = between(app, "function renderInteraction", "function renderBoardInteractionPanel");
  assert.match(interaction, /interaction\.cancelable === false \? ''/);
  assert.match(app, /state\.interaction\?\.cancelable !== false && \['ATTACK','EMPLOYEE','SUPPORT','TARGETS','PROMOTION'\]/);
});

test("the board interaction dock is compact, screen-space and has no backdrop", () => {
  const dock = between(css, "/* Board-target choices stay", "@media (max-width:760px) {");
  assert.match(dock, /\.board-interaction-panel \{[\s\S]*?position:fixed/);
  assert.match(dock, /pointer-events:none/);
  assert.match(dock, /\.board-interaction-panel \.interaction-panel \{[\s\S]*?pointer-events:auto/);
  assert.doesNotMatch(dock, /backdrop/);
  assert.match(css, /\.board-interaction-panel \.mandatory-interaction/);
});

test("interaction copy is localized in both supported dictionaries", () => {
  assert.match(en, /matchInteraction: \{/);
  assert.match(de, /matchInteraction: \{/);
  assert.match(en, /pendingTargetHint: "Choose a highlighted legal target on the Board\."/);
  assert.match(de, /pendingTargetHint: "Wähle ein hervorgehobenes gültiges Ziel auf dem Spielfeld\."/);
  assert.match(en, /common: \{[^}]*cancel: "Cancel"/);
  assert.match(de, /common: \{[^}]*cancel: "Abbrechen"/);
});

console.log(`\n${passed}/${passed} v7.69.27 interaction UX tests passed.`);
