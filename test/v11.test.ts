import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { validateDeck } from "../src/engine.js";
import { ALPHA_FORMAT } from "../src/formats.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const tests: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) { tests.push([name, fn]); }

test("v1.1 exposes exactly the five Alpha starter presets", () => {
  const ids = Object.keys(alphaDeckPresets).sort();
  assert(ids.length === 5, `Expected 5 starter presets, got ${ids.length}`);
  for (const expected of ["customer-service-starter", "it-starter", "office-starter", "marketing-starter", "production-starter"]) {
    assert(ids.includes(expected), `Missing starter preset ${expected}`);
  }
});

test("all Alpha starter presets validate against the external Alpha format", () => {
  for (const preset of Object.values(alphaDeckPresets)) {
    const result = validateDeck(preset.cards, alphaDefinitions, ALPHA_FORMAT);
    assert(result.valid, `${preset.id} should be legal: ${result.errors.join(" | ")}`);
  }
});

test("all starter card definitions exist and expose implementation metadata", () => {
  for (const preset of Object.values(alphaDeckPresets)) {
    for (const entry of preset.cards) {
      const def = alphaDefinitions[entry.definitionId];
      assert(def, `${preset.id} references missing card ${entry.definitionId}`);
      assert(typeof def.rulesText === "string", `${entry.definitionId} should expose rulesText`);
      assert(["FULL", "PARTIAL", "TEXT_ONLY"].includes(def.implementationStatus ?? "FULL"), `${entry.definitionId} has invalid implementationStatus`);
    }
  }
});

test("card catalog contains all five department identities plus Neutral", () => {
  const departments = new Set(Object.values(alphaDefinitions).map((x) => x.department));
  for (const department of ["CUSTOMER_SERVICE", "IT", "OFFICE", "MARKETING", "PRODUCTION", "NEUTRAL"] as const) {
    assert(departments.has(department), `Missing department ${department}`);
  }
});

test("implementation status is transparent rather than silently claiming all cards are complete", () => {
  const statuses = Object.values(alphaDefinitions).map((x) => x.implementationStatus ?? "FULL");
  assert(statuses.includes("FULL"), "Catalog should contain engine-ready cards");
  assert(statuses.every((status)=>["FULL","PARTIAL","TEXT_ONLY"].includes(status)), "Catalog should expose valid implementation status values");
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
console.log(`\nv1.1 catalog/UI-data tests: ${passed}/${tests.length} passed`);
