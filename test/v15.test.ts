import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runBalanceSeries } from "../src/balance.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("balance runner covers all ten starter matchups deterministically", () => {
  const a = runBalanceSeries({ gamesPerMatchup: 1, baseSeed: 15501, maxTurns: 20, maxSteps: 1200 });
  const b = runBalanceSeries({ gamesPerMatchup: 1, baseSeed: 15501, maxTurns: 20, maxSteps: 1200 });
  assert.equal(a.games.length, 10);
  assert.equal(a.matchups.length, 10);
  assert.deepEqual(
    a.games.map((g) => [g.p1Deck, g.p2Deck, g.firstPlayer, g.winner, g.turnNumber, g.reason]),
    b.games.map((g) => [g.p1Deck, g.p2Deck, g.firstPlayer, g.winner, g.turnNumber, g.reason])
  );
});

test("balance telemetry marks itself as heuristic rather than balance truth", () => {
  const report = runBalanceSeries({ gamesPerMatchup: 1, baseSeed: 15599, maxTurns: 8, maxSteps: 600 });
  assert.match(report.note, /heuristic/i);
  assert.equal(report.totals.games, 10);
});

test("browser playtest no longer uses prompt-based target or slot selection", () => {
  const appPath = fileURLToPath(new URL("../../public/app.js", import.meta.url));
  const source = readFileSync(appPath, "utf8");
  assert.match(source, /beginTargetIntent/);
  assert.match(source, /data-target-card/);
  assert.match(source, /data-field-slot-zone/);
  // Legacy helpers may remain for compatibility during the prototype, but live handlers must not call them.
  const handlerStart = source.indexOf("function bindGameHandlers");
  const handlerSource = source.slice(handlerStart);
  assert.doesNotMatch(handlerSource, /chooseTargets\(/);
  assert.doesNotMatch(handlerSource, /chooseIndex\(/);
});

console.log(`${passed}/3 v1.5 tests passed.`);
